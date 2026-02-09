"""Main pipeline orchestrator.

Coordinates all stages: frame extraction → Gemini analysis → highlight selection →
deduplication → clip generation → result writing.
"""

from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from pathlib import Path

import numpy as np

from frame_extractor import extract_frames
from video_analyzer import create_client as create_gemini_client, analyze_frames
from deduplicator import load_clip_model, compute_embeddings, deduplicate_highlights
from clip_generator import generate_all_clips
from supabase_writer import (
    create_supabase_client,
    write_results,
    update_job_progress,
    mark_video_processed,
    mark_video_failed,
    trigger_dive_log_generation,
)

logger = logging.getLogger(__name__)

# Composite scoring weights (v2b: no YOLO, all from Gemini)
WEIGHTS = {
    "has_species": 3.0,
    "num_species": 0.5,      # capped at 3.0 total
    "rare_species": 2.0,
    "gemini_interest": 1.0,  # 0-10 from Gemini
}

RARE_SPECIES = {
    "manta ray", "whale shark", "hammerhead shark", "napoleon wrasse",
    "dugong", "humpback whale", "nudibranch", "seahorse", "octopus",
    "cuttlefish", "mantis shrimp",
}

MAX_HIGHLIGHTS = 12
MIN_HIGHLIGHTS = 3
CLIP_PADDING_SECONDS = 0.5
MIN_CLIP_DURATION = 5.0
MAX_CLIP_DURATION = 45.0
CONSECUTIVE_FRAME_GAP = 5.0  # seconds


def process_video(
    video_path: str,
    video_id: str,
    dive_id: str,
    user_id: str,
    job_id: str,
    supabase_url: str,
    supabase_service_key: str,
    gemini_api_key: str,
) -> dict:
    """Run the full processing pipeline on a dive video.

    Args:
        video_path: Local path to the downloaded video
        video_id: UUID of the video row
        dive_id: UUID of the dive
        user_id: UUID of the user
        job_id: UUID of the processing_jobs row to update
        supabase_url: Supabase project URL
        supabase_service_key: Service role key
        gemini_api_key: Google AI API key

    Returns:
        Summary of processing results
    """
    sb = create_supabase_client(supabase_url, supabase_service_key)

    with tempfile.TemporaryDirectory() as work_dir:
        try:
            # --- Stage 1: Frame extraction ---
            update_job_progress(sb, job_id, 5, "running")
            logger.info("Stage 1: Extracting frames from %s", video_path)

            frame_result = extract_frames(video_path, os.path.join(work_dir, "frames"))
            frames = frame_result["frames"]
            metadata = frame_result["metadata"]
            logger.info("Extracted %d frames (duration: %.1fs)", len(frames), metadata["duration"])

            update_job_progress(sb, job_id, 15)

            if not frames:
                update_job_progress(sb, job_id, 100, "completed", {"highlights": 0, "error": "no_frames"})
                mark_video_processed(sb, video_id)
                return {"highlights": 0, "error": "no_frames"}

            # --- Stage 2: Gemini frame analysis (species + interest scoring) ---
            logger.info("Stage 2: Analyzing %d frames with Gemini", len(frames))
            gemini_client = create_gemini_client(gemini_api_key)
            analysis = asyncio.run(analyze_frames(gemini_client, frames))
            logger.info("Analyzed %d frames", len(analysis))

            update_job_progress(sb, job_id, 55)

            # Fetch species table for mapping
            species_result = sb.table("species").select("id, common_name, scientific_name, category").execute()
            species_rows = species_result.data or []

            # --- Stage 3: Highlight selection + CLIP dedup ---
            logger.info("Stage 3: Selecting highlights")
            candidates = _build_candidates(frames, analysis, metadata)
            logger.info("Built %d highlight candidates", len(candidates))

            if not candidates:
                update_job_progress(sb, job_id, 100, "completed", {"highlights": 0})
                mark_video_processed(sb, video_id)
                trigger_dive_log_generation(sb, supabase_url, supabase_service_key, dive_id, user_id)
                return {"highlights": 0}

            # CLIP deduplication
            logger.info("Deduplicating with CLIP")
            device = "cuda" if _cuda_available() else "cpu"
            clip_model, clip_processor = load_clip_model(device)

            candidate_paths = [c["best_frame_path"] for c in candidates]
            embeddings = compute_embeddings(clip_model, clip_processor, candidate_paths, device)

            if embeddings.size > 0:
                unique_highlights = deduplicate_highlights(
                    candidates, embeddings,
                    min_highlights=MIN_HIGHLIGHTS,
                )
            else:
                unique_highlights = candidates

            # Cap highlights
            unique_highlights = unique_highlights[:MAX_HIGHLIGHTS]

            logger.info("Selected %d unique highlights", len(unique_highlights))
            update_job_progress(sb, job_id, 70)

            # --- Stage 4: Clip & thumbnail generation ---
            logger.info("Stage 4: Generating clips and thumbnails")
            output_dir = os.path.join(work_dir, "output")
            enriched_highlights = generate_all_clips(video_path, unique_highlights, output_dir)
            logger.info("Generated %d clips", len(enriched_highlights))

            update_job_progress(sb, job_id, 90)

            # --- Stage 5: Write results ---
            logger.info("Stage 5: Writing results to Supabase")
            write_summary = write_results(
                sb, video_id, dive_id, user_id, enriched_highlights, species_rows,
            )
            logger.info("Wrote %d highlights, %d species links",
                         write_summary["highlights_created"], write_summary["species_linked"])

            # Mark complete
            mark_video_processed(sb, video_id)
            update_job_progress(sb, job_id, 100, "completed", write_summary)

            # Trigger dive log generation
            trigger_dive_log_generation(sb, supabase_url, supabase_service_key, dive_id, user_id)

            return write_summary

        except Exception as e:
            logger.exception("Pipeline failed for video %s", video_id)
            mark_video_failed(sb, video_id, str(e))
            update_job_progress(sb, job_id, 0, "failed", error=str(e))
            raise


def _build_candidates(
    frames: list[dict],
    analysis: list[dict],
    metadata: dict,
) -> list[dict]:
    """Build and rank highlight candidates from Gemini analysis.

    Groups frames into segments, computes composite scores,
    and returns sorted candidates ready for deduplication.
    """
    # Index analysis by frame
    analysis_by_frame: dict[int, dict] = {}
    for a in analysis:
        analysis_by_frame[a["frame_idx"]] = a

    # Score each frame
    frame_scores = []
    for idx, frame in enumerate(frames):
        frame_analysis = analysis_by_frame.get(idx, {})

        species = frame_analysis.get("species", [])
        has_species = len(species) > 0
        num_species = len(set(species))
        has_rare = any(
            sp.lower() in RARE_SPECIES
            for sp in species
        )
        gemini_interest = frame_analysis.get("interest_score", 0)

        composite = (
            (WEIGHTS["has_species"] if has_species else 0)
            + min(num_species * WEIGHTS["num_species"], 3.0)
            + (WEIGHTS["rare_species"] if has_rare else 0)
            + gemini_interest * WEIGHTS["gemini_interest"]
        )

        frame_scores.append({
            "frame_idx": idx,
            "timestamp": frame["timestamp"],
            "frame_path": frame["path"],
            "composite_score": composite,
            "species": species,
            "description": frame_analysis.get("description", ""),
        })

    # Sort by score
    frame_scores.sort(key=lambda f: f["composite_score"], reverse=True)

    # Filter: must have species or high Gemini interest
    min_score = WEIGHTS["has_species"]
    scored_frames = [f for f in frame_scores if f["composite_score"] >= min_score]

    # Fallback to Gemini-only frames above threshold
    if not scored_frames:
        gemini_threshold = 6.0
        scored_frames = [f for f in frame_scores if f["composite_score"] >= gemini_threshold * WEIGHTS["gemini_interest"]]

    if not scored_frames:
        return []

    # Group into segments
    segments = _group_into_segments(scored_frames, metadata["duration"])

    return segments


def _group_into_segments(scored_frames: list[dict], video_duration: float) -> list[dict]:
    """Group high-scoring frames into highlight segments."""
    if not scored_frames:
        return []

    # Sort by timestamp for grouping
    by_time = sorted(scored_frames, key=lambda f: f["timestamp"])

    segments = []
    current_segment = [by_time[0]]

    for frame in by_time[1:]:
        if frame["timestamp"] - current_segment[-1]["timestamp"] <= CONSECUTIVE_FRAME_GAP:
            current_segment.append(frame)
        else:
            segments.append(current_segment)
            current_segment = [frame]
    segments.append(current_segment)

    # Convert each segment to a highlight candidate
    candidates = []
    for segment in segments:
        best_frame = max(segment, key=lambda f: f["composite_score"])

        # Compute segment boundaries
        start = min(f["timestamp"] for f in segment) - CLIP_PADDING_SECONDS
        end = max(f["timestamp"] for f in segment) + CLIP_PADDING_SECONDS
        start = max(0, start)
        end = min(video_duration, end)

        # Enforce clip duration limits
        duration = end - start
        if duration < MIN_CLIP_DURATION:
            extend = (MIN_CLIP_DURATION - duration) / 2
            start = max(0, start - extend)
            end = min(video_duration, end + extend)
        elif duration > MAX_CLIP_DURATION:
            center = best_frame["timestamp"]
            start = max(0, center - MAX_CLIP_DURATION / 2)
            end = min(video_duration, start + MAX_CLIP_DURATION)

        # Collect all species from the segment
        all_species = set()
        for f in segment:
            all_species.update(f.get("species", []))

        # Generate title from Gemini species names
        species_list = list(all_species)
        if species_list:
            if len(species_list) == 1:
                title = f"{species_list[0]} encounter"
            elif len(species_list) == 2:
                title = f"{species_list[0]} and {species_list[1]}"
            else:
                title = f"{species_list[0]} and {len(species_list) - 1} more species"
        else:
            title = best_frame.get("description", "Interesting moment")

        candidates.append({
            "start_time": round(start, 2),
            "end_time": round(end, 2),
            "best_timestamp": round(best_frame["timestamp"], 2),
            "best_frame_path": best_frame["frame_path"],
            "composite_score": best_frame["composite_score"],
            "species": species_list,
            "title": title,
            "description": best_frame.get("description", ""),
        })

    # Sort by composite score
    candidates.sort(key=lambda c: c["composite_score"], reverse=True)
    return candidates


def _cuda_available() -> bool:
    """Check if CUDA is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False
