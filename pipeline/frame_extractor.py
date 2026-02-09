"""Stage 1: Extract frames from dive video using ffmpeg.

Two strategies:
1. Scene-change detection - captures visual transitions
2. Fixed-interval (0.5 fps) - ensures no long gaps
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


def get_video_metadata(video_path: str) -> dict:
    """Extract video metadata using ffprobe if available, otherwise ffmpeg."""
    try:
        return _metadata_via_ffprobe(video_path)
    except FileNotFoundError:
        return _metadata_via_ffmpeg(video_path)


def _metadata_via_ffprobe(video_path: str) -> dict:
    """Extract metadata using ffprobe (preferred)."""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    probe = json.loads(result.stdout)

    video_stream = next(
        (s for s in probe.get("streams", []) if s["codec_type"] == "video"), None
    )
    fmt = probe.get("format", {})

    duration = float(fmt.get("duration", 0))
    width = int(video_stream["width"]) if video_stream else 0
    height = int(video_stream["height"]) if video_stream else 0
    fps_parts = video_stream.get("r_frame_rate", "30/1").split("/") if video_stream else ["30", "1"]
    fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 and float(fps_parts[1]) > 0 else 30.0

    return {
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "format": fmt.get("format_name", "unknown"),
    }


def _metadata_via_ffmpeg(video_path: str) -> dict:
    """Extract metadata from ffmpeg stderr output (fallback when ffprobe unavailable)."""
    cmd = ["ffmpeg", "-i", video_path, "-f", "null", "-"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    stderr = result.stderr

    duration = 0.0
    duration_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+)\.(\d+)", stderr)
    if duration_match:
        h, m, s, cs = duration_match.groups()
        duration = int(h) * 3600 + int(m) * 60 + int(s) + int(cs) / 100

    width, height = 0, 0
    res_match = re.search(r"(\d{2,5})x(\d{2,5})", stderr)
    if res_match:
        width, height = int(res_match.group(1)), int(res_match.group(2))

    fps = 30.0
    fps_match = re.search(r"(\d+(?:\.\d+)?)\s*fps", stderr)
    if fps_match:
        fps = float(fps_match.group(1))

    return {
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "format": "unknown",
    }


def extract_frames(video_path: str, output_dir: str) -> dict:
    """Extract frames using scene-change detection and fixed-interval sampling.

    Returns dict with:
        - frames: list of {path, timestamp, source} dicts
        - metadata: video metadata
        - frame_count: total frames extracted
    """
    output = Path(output_dir)
    scene_dir = output / "scene"
    interval_dir = output / "interval"
    scene_dir.mkdir(parents=True, exist_ok=True)
    interval_dir.mkdir(parents=True, exist_ok=True)

    metadata = get_video_metadata(video_path)

    # Pass 1: Scene-change detection frames
    scene_frames = _extract_scene_change_frames(video_path, str(scene_dir))

    # Pass 2: Fixed-interval frames (every 2 seconds = 0.5 fps)
    interval_frames = _extract_interval_frames(video_path, str(interval_dir))

    # Deduplicate by timestamp (within 1s tolerance)
    all_frames = _merge_frames(scene_frames, interval_frames)

    return {
        "frames": all_frames,
        "metadata": metadata,
        "frame_count": len(all_frames),
    }


def _extract_scene_change_frames(video_path: str, output_dir: str) -> list[dict]:
    """Extract frames at scene changes."""
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", "select=gt(scene\\,0.3),scale=640:360,showinfo",
        "-vsync", "vfr",
        "-q:v", "2",
        f"{output_dir}/scene_%04d.jpg",
        "-y",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    # Parse timestamps from ffmpeg stderr (showinfo filter output)
    frames = []
    frame_idx = 0
    for line in result.stderr.split("\n"):
        if "pts_time:" in line:
            try:
                pts_str = line.split("pts_time:")[1].split()[0]
                timestamp = float(pts_str)
                frame_idx += 1
                frame_path = f"{output_dir}/scene_{frame_idx:04d}.jpg"
                if Path(frame_path).exists():
                    frames.append({
                        "path": frame_path,
                        "timestamp": timestamp,
                        "source": "scene_change",
                    })
            except (ValueError, IndexError):
                continue

    return frames


def _extract_interval_frames(video_path: str, output_dir: str) -> list[dict]:
    """Extract frames at fixed 0.5 fps (one every 2 seconds)."""
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", "fps=0.5,scale=640:360,showinfo",
        "-q:v", "2",
        f"{output_dir}/interval_%04d.jpg",
        "-y",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    frames = []
    frame_idx = 0
    for line in result.stderr.split("\n"):
        if "pts_time:" in line:
            try:
                pts_str = line.split("pts_time:")[1].split()[0]
                timestamp = float(pts_str)
                frame_idx += 1
                frame_path = f"{output_dir}/interval_{frame_idx:04d}.jpg"
                if Path(frame_path).exists():
                    frames.append({
                        "path": frame_path,
                        "timestamp": timestamp,
                        "source": "interval",
                    })
            except (ValueError, IndexError):
                continue

    return frames


def _merge_frames(scene_frames: list[dict], interval_frames: list[dict]) -> list[dict]:
    """Merge scene-change and interval frames, deduplicating within 1s tolerance."""
    scene_timestamps = {f["timestamp"] for f in scene_frames}
    merged = list(scene_frames)

    for frame in interval_frames:
        # Only add interval frame if no scene frame exists within 1 second
        is_duplicate = any(abs(frame["timestamp"] - st) < 1.0 for st in scene_timestamps)
        if not is_duplicate:
            merged.append(frame)

    merged.sort(key=lambda f: f["timestamp"])
    return merged
