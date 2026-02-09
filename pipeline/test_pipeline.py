"""Local test harness for the DiveApp AI pipeline (v2b).

Runs each stage independently, saves intermediate results to output/,
and prints detailed summaries for review.

Usage:
    python test_pipeline.py                     # Run all stages
    python test_pipeline.py --stage 1           # Run only stage 1 (frame extraction)
    python test_pipeline.py --stage 2           # Run only stage 2 (Gemini frame analysis)
    python test_pipeline.py --stage 3           # Run only stage 3 (highlight selection + dedup)
    python test_pipeline.py --stage 4           # Run only stage 4 (clip + thumbnail generation)
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Ensure pipeline modules are importable
sys.path.insert(0, os.path.dirname(__file__))

# Use the bundled ffmpeg from imageio-ffmpeg
try:
    import imageio_ffmpeg
    ffmpeg_path = os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
    os.environ["PATH"] = ffmpeg_path + ":" + os.environ.get("PATH", "")
    # Also symlink ffprobe if it exists alongside ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    ffprobe_candidates = [f for f in os.listdir(ffmpeg_dir) if "ffprobe" in f]
    if not ffprobe_candidates:
        # imageio-ffmpeg only ships ffmpeg, not ffprobe. We'll handle this in stage 1.
        pass
except ImportError:
    pass

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
INPUT_DIR = PROJECT_ROOT / "input"
OUTPUT_DIR = PROJECT_ROOT / "output"
VIDEO_PATH = None

# Find test video
for f in INPUT_DIR.iterdir() if INPUT_DIR.exists() else []:
    if f.suffix.lower() in (".mp4", ".mov", ".mkv", ".avi", ".webm"):
        VIDEO_PATH = f
        break


def banner(text: str):
    width = 60
    print("\n" + "=" * width)
    print(f"  {text}")
    print("=" * width)


def save_json(data, filename: str):
    path = OUTPUT_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)
    print(f"  -> Saved to {path}")


def load_json(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        print(f"  !! {path} not found. Run previous stages first.")
        return None
    with open(path) as f:
        return json.load(f)


# ── Stage 1: Frame Extraction ────────────────────────────────────

def run_stage_1():
    banner("STAGE 1: Frame Extraction")
    from frame_extractor import extract_frames, get_video_metadata

    if not VIDEO_PATH:
        print("  !! No video found in input/")
        return

    print(f"  Video: {VIDEO_PATH}")
    print(f"  Size: {VIDEO_PATH.stat().st_size / 1024 / 1024:.1f} MB")

    # First get metadata
    print("\n  Extracting metadata...")
    try:
        metadata = get_video_metadata(str(VIDEO_PATH))
        print(f"  Duration: {metadata['duration']:.1f}s")
        print(f"  Resolution: {metadata['width']}x{metadata['height']}")
        print(f"  FPS: {metadata['fps']:.1f}")
        print(f"  Format: {metadata['format']}")
    except Exception as e:
        print(f"  !! ffprobe failed: {e}")
        print("  Falling back to ffmpeg-only extraction...")
        metadata = {"duration": 0, "width": 0, "height": 0, "fps": 30.0, "format": "unknown"}

    # Extract frames
    frames_dir = str(OUTPUT_DIR / "frames")
    print(f"\n  Extracting frames to {frames_dir}...")
    t0 = time.time()

    result = extract_frames(str(VIDEO_PATH), frames_dir)
    elapsed = time.time() - t0

    frames = result["frames"]
    print(f"\n  Extracted {len(frames)} frames in {elapsed:.1f}s")
    print(f"  Scene-change frames: {sum(1 for f in frames if f['source'] == 'scene_change')}")
    print(f"  Interval frames: {sum(1 for f in frames if f['source'] == 'interval')}")

    if frames:
        print(f"\n  First 10 frames:")
        for f in frames[:10]:
            print(f"    {f['timestamp']:7.1f}s  [{f['source']:13s}]  {Path(f['path']).name}")

    # Save results
    save_json({"frames": frames, "metadata": metadata}, "stage1_frames.json")
    return result


# ── Stage 2: Gemini Frame Analysis ───────────────────────────────

def run_stage_2():
    banner("STAGE 2: Gemini Frame Analysis (species + interest)")

    gemini_key = os.environ.get("GOOGLE_AI_API_KEY", "")
    if not gemini_key:
        print("  !! GOOGLE_AI_API_KEY not set. Skipping Gemini analysis.")
        print("  Set it with: export GOOGLE_AI_API_KEY=your-key")
        print("  Generating mock analysis instead...")
        return _mock_stage_2()

    import asyncio
    from video_analyzer import create_client, analyze_frames

    stage1 = load_json("stage1_frames.json")
    if not stage1:
        return

    frames = stage1["frames"]
    print(f"  Input: {len(frames)} frames (ALL sent to Gemini)")

    client = create_client(gemini_key)

    print("  Analyzing with Gemini 2.5 Flash...")
    t0 = time.time()
    analysis = asyncio.run(analyze_frames(client, frames, batch_size=10, max_concurrent=3))
    elapsed = time.time() - t0

    print(f"\n  Analyzed {len(analysis)} frames in {elapsed:.1f}s")

    if analysis:
        by_score = sorted(analysis, key=lambda s: -s["interest_score"])
        print(f"\n  Top 10 highest-interest frames:")
        for s in by_score[:10]:
            species_str = ", ".join(s.get("species", [])) or "none"
            print(f"    frame_{s['frame_idx']:04d}  score={s['interest_score']:2d}  "
                  f"species=[{species_str}]")
            if s.get("description"):
                print(f"                  \"{s['description']}\"")

        # Species summary
        all_species: dict[str, int] = {}
        for s in analysis:
            for sp in s.get("species", []):
                all_species[sp] = all_species.get(sp, 0) + 1
        if all_species:
            print(f"\n  Species detected ({len(all_species)} unique):")
            for sp, count in sorted(all_species.items(), key=lambda x: -x[1]):
                print(f"    {sp:30s}  {count:3d} frames")

        # Score distribution
        dist: dict[int, int] = {}
        for s in analysis:
            bucket = s["interest_score"]
            dist[bucket] = dist.get(bucket, 0) + 1
        print(f"\n  Score distribution:")
        for score in sorted(dist.keys()):
            bar = "#" * dist[score]
            print(f"    {score:2d}: {bar} ({dist[score]})")

    save_json(analysis, "stage2_analysis.json")
    return analysis


def _mock_stage_2():
    """Generate mock analysis when Gemini isn't available."""
    import random

    stage1 = load_json("stage1_frames.json")
    if not stage1:
        return

    frames = stage1["frames"]
    mock_species = [
        ["Leather Coral", "Reef Fish"],
        ["Moray Eel"],
        ["Sea Cucumber"],
        ["Clownfish", "Anemone"],
        [],
        ["Grouper"],
        ["Diver"],
    ]

    analysis = []
    for idx in range(len(frames)):
        species = random.choice(mock_species)
        score = min(10, max(1, (6 if species else 2) + random.randint(-2, 3)))
        analysis.append({
            "frame_idx": idx,
            "interest_score": score,
            "species": species,
            "description": f"Mock analysis for frame at {frames[idx]['timestamp']:.1f}s",
        })

    print(f"  Generated {len(analysis)} mock analyses")
    save_json(analysis, "stage2_analysis.json")
    return analysis


# ── Stage 3: Highlight Selection + Deduplication ─────────────────

def run_stage_3():
    banner("STAGE 3: Highlight Selection + CLIP Deduplication")

    stage1 = load_json("stage1_frames.json")
    stage2 = load_json("stage2_analysis.json")
    if not stage1 or not stage2:
        return

    frames = stage1["frames"]
    metadata = stage1["metadata"]
    analysis = stage2

    from processor import _build_candidates, WEIGHTS, RARE_SPECIES

    print(f"  Input: {len(frames)} frames, {len(analysis)} analyses")

    # Build candidates
    print("  Building highlight candidates...")
    candidates = _build_candidates(frames, analysis, metadata)
    print(f"  Built {len(candidates)} candidates")

    if candidates:
        print(f"\n  All candidates (pre-dedup):")
        for i, c in enumerate(candidates):
            species_str = ", ".join(c.get("species", [])) or "none"
            print(f"    #{i+1:2d}  score={c['composite_score']:6.2f}  "
                  f"t={c['start_time']:.1f}-{c['end_time']:.1f}s  "
                  f"species=[{species_str}]")
            if c.get("title"):
                print(f"         title: \"{c['title']}\"")

    # CLIP deduplication
    if len(candidates) > 1:
        print(f"\n  Running CLIP deduplication (threshold=0.75)...")
        from deduplicator import load_clip_model, compute_embeddings, deduplicate_highlights

        device = "cpu"  # No CUDA locally
        t0 = time.time()
        clip_model, clip_processor = load_clip_model(device)
        print(f"  CLIP model loaded in {time.time() - t0:.1f}s")

        candidate_paths = [c["best_frame_path"] for c in candidates]
        t0 = time.time()
        embeddings = compute_embeddings(clip_model, clip_processor, candidate_paths, device)
        print(f"  Computed {embeddings.shape[0]} embeddings in {time.time() - t0:.1f}s")

        # Show similarity matrix for review
        if embeddings.shape[0] > 0:
            import numpy as np
            sim_matrix = np.dot(embeddings, embeddings.T)
            print(f"\n  Cosine similarity matrix (top-left 8x8):")
            n = min(8, sim_matrix.shape[0])
            print("        " + "".join(f"  #{i+1:2d} " for i in range(n)))
            for i in range(n):
                row = "".join(f"  {sim_matrix[i][j]:.2f}" for j in range(n))
                print(f"    #{i+1:2d}{row}")

            unique = deduplicate_highlights(candidates, embeddings)
            print(f"\n  After dedup: {len(unique)} unique highlights (from {len(candidates)})")
        else:
            unique = candidates
    else:
        unique = candidates

    # Cap
    from processor import MAX_HIGHLIGHTS
    final = unique[:MAX_HIGHLIGHTS]

    if final:
        print(f"\n  Final {len(final)} highlights:")
        for i, h in enumerate(final):
            species_str = ", ".join(h.get("species", [])) or "none"
            duration = h["end_time"] - h["start_time"]
            print(f"    #{i+1:2d}  score={h['composite_score']:6.2f}  "
                  f"t={h['start_time']:.1f}-{h['end_time']:.1f}s ({duration:.1f}s)  "
                  f"species=[{species_str}]")
            print(f"         title: \"{h.get('title', 'N/A')}\"")
            if h.get("description"):
                print(f"         desc:  \"{h['description']}\"")

    save_json(final, "stage3_highlights.json")
    return final


# ── Stage 4: Clip & Thumbnail Generation ─────────────────────────

def run_stage_4():
    banner("STAGE 4: Clip & Thumbnail Generation")
    from clip_generator import generate_all_clips

    highlights = load_json("stage3_highlights.json")
    if not highlights:
        return

    if not VIDEO_PATH:
        print("  !! No video found in input/")
        return

    print(f"  Input: {len(highlights)} highlights")
    print(f"  Video: {VIDEO_PATH}")

    output_dir = str(OUTPUT_DIR / "clips_and_thumbs")
    print(f"  Output: {output_dir}")

    t0 = time.time()
    results = generate_all_clips(str(VIDEO_PATH), highlights, output_dir)
    elapsed = time.time() - t0

    print(f"\n  Generated in {elapsed:.1f}s:")
    for i, r in enumerate(results):
        clip_path = r.get("local_clip_path", "FAILED")
        thumb_path = r.get("local_thumbnail_path", "FAILED")
        clip_size = Path(clip_path).stat().st_size / 1024 if clip_path != "FAILED" and Path(clip_path).exists() else 0
        thumb_size = Path(thumb_path).stat().st_size / 1024 if thumb_path != "FAILED" and Path(thumb_path).exists() else 0
        print(f"    #{i+1:2d}  clip: {clip_size:.0f}KB  thumb: {thumb_size:.0f}KB  "
              f"t={r['start_time']:.1f}-{r['end_time']:.1f}s  \"{r.get('title', '')}\"")

    save_json(results, "stage4_results.json")

    # Summary
    total_clips = sum(1 for r in results if r.get("local_clip_path"))
    total_thumbs = sum(1 for r in results if r.get("local_thumbnail_path"))
    print(f"\n  Summary: {total_clips}/{len(results)} clips, {total_thumbs}/{len(results)} thumbnails")

    return results


# ── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Test the DiveApp AI pipeline (v2b)")
    parser.add_argument("--stage", type=int, choices=[1, 2, 3, 4],
                        help="Run only a specific stage (1-4)")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    banner("DiveApp AI Pipeline v2b - Local Test")
    print("  v2b: All frames → Gemini (no YOLO)")
    if VIDEO_PATH:
        print(f"  Video: {VIDEO_PATH}")
        print(f"  Output: {OUTPUT_DIR}")
    else:
        print("  !! No video found in input/")
        if not args.stage or args.stage == 1:
            return

    stages = {
        1: run_stage_1,
        2: run_stage_2,
        3: run_stage_3,
        4: run_stage_4,
    }

    if args.stage:
        stages[args.stage]()
    else:
        t_total = time.time()
        for num, fn in stages.items():
            fn()
        elapsed = time.time() - t_total
        banner(f"ALL STAGES COMPLETE ({elapsed:.1f}s total)")


if __name__ == "__main__":
    main()
