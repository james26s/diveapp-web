"""Stage 5: Generate video clips and thumbnails using ffmpeg.

Cuts highlight clips from the source video and extracts best-frame thumbnails.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


def generate_clip(
    video_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
) -> bool:
    """Cut a highlight clip from the source video.

    Args:
        video_path: Path to source video
        output_path: Where to save the clip
        start_time: Start timestamp in seconds
        end_time: End timestamp in seconds

    Returns:
        True if successful
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-ss", str(start_time),
        "-to", str(end_time),
        "-i", video_path,
        "-c:v", "libx264",
        "-crf", "23",
        "-preset", "fast",
        "-c:a", "aac",
        "-movflags", "+faststart",
        "-y",
        output_path,
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=120)
        return True
    except subprocess.CalledProcessError as e:
        logger.error("Clip generation failed: %s", e.stderr)
        return False
    except subprocess.TimeoutExpired:
        logger.error("Clip generation timed out for %s-%s", start_time, end_time)
        return False


def generate_thumbnail(
    output_path: str,
    best_frame_path: str,
    video_path: str | None = None,
    timestamp: float | None = None,
) -> bool:
    """Create a thumbnail from the already-extracted frame JPEG.

    Copies the extracted frame directly instead of re-extracting from video
    with ffmpeg -ss, which seeks to the nearest keyframe and often produces
    the wrong frame (e.g., blank blue water instead of the actual subject).

    Falls back to ffmpeg extraction if the frame file doesn't exist.

    Args:
        output_path: Where to save the thumbnail
        best_frame_path: Path to the already-extracted frame JPEG
        video_path: Fallback source video (used only if frame file missing)
        timestamp: Fallback timestamp (used only if frame file missing)

    Returns:
        True if successful
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Use the already-extracted frame (correct content, correct timestamp)
    if best_frame_path and Path(best_frame_path).exists():
        try:
            shutil.copy2(best_frame_path, output_path)
            return True
        except OSError as e:
            logger.warning("Failed to copy frame %s: %s", best_frame_path, e)

    # Fallback: re-extract from video (may get wrong keyframe)
    if video_path and timestamp is not None:
        logger.warning("Falling back to ffmpeg thumbnail extraction at %.1fs", timestamp)
        cmd = [
            "ffmpeg",
            "-ss", str(timestamp),
            "-i", video_path,
            "-frames:v", "1",
            "-q:v", "1",
            "-y",
            output_path,
        ]
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
            return True
        except subprocess.CalledProcessError as e:
            logger.error("Thumbnail generation failed: %s", e.stderr)
            return False
        except subprocess.TimeoutExpired:
            logger.error("Thumbnail generation timed out at %s", timestamp)
            return False

    logger.error("No frame file or video path available for thumbnail")
    return False


def generate_all_clips(
    video_path: str,
    highlights: list[dict],
    output_dir: str,
) -> list[dict]:
    """Generate clips and thumbnails for all highlights.

    Args:
        video_path: Path to source video
        highlights: List of highlight dicts with start_time, end_time, best_timestamp
        output_dir: Base directory for output files

    Returns:
        Highlights enriched with clip_path and thumbnail_path
    """
    output = Path(output_dir)
    clips_dir = output / "clips"
    thumbs_dir = output / "thumbnails"
    clips_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for idx, highlight in enumerate(highlights):
        clip_filename = f"clip_{idx:03d}.mp4"
        thumb_filename = f"thumb_{idx:03d}.jpg"
        clip_path = str(clips_dir / clip_filename)
        thumb_path = str(thumbs_dir / thumb_filename)

        clip_ok = generate_clip(
            video_path, clip_path,
            highlight["start_time"], highlight["end_time"],
        )
        thumb_ok = generate_thumbnail(
            output_path=thumb_path,
            best_frame_path=highlight.get("best_frame_path", ""),
            video_path=video_path,
            timestamp=highlight.get("best_timestamp", highlight["start_time"]),
        )

        enriched = {**highlight}
        if clip_ok:
            enriched["local_clip_path"] = clip_path
        if thumb_ok:
            enriched["local_thumbnail_path"] = thumb_path

        results.append(enriched)

    return results
