"""Write pipeline results to Supabase DB and Storage.

Handles uploading clips/thumbnails to Storage and inserting
highlights, highlight_species rows into the database.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from supabase import create_client, Client

logger = logging.getLogger(__name__)

HIGHLIGHTS_BUCKET = "highlights"


def create_supabase_client(url: str, service_key: str) -> Client:
    """Create Supabase client with service role key."""
    return create_client(url, service_key)


def upload_file_to_storage(
    client: Client,
    bucket: str,
    storage_path: str,
    local_path: str,
) -> str | None:
    """Upload a file to Supabase Storage.

    Returns the storage path on success, None on failure.
    """
    try:
        with open(local_path, "rb") as f:
            content_type = "video/mp4" if local_path.endswith(".mp4") else "image/jpeg"
            client.storage.from_(bucket).upload(
                path=storage_path,
                file=f,
                file_options={"content-type": content_type},
            )
        return storage_path
    except Exception as e:
        logger.error("Storage upload failed for %s: %s", storage_path, e)
        return None


def write_results(
    client: Client,
    video_id: str,
    dive_id: str,
    user_id: str,
    highlights: list[dict],
    species_rows: list[dict],
) -> dict:
    """Write all pipeline results to Supabase.

    Args:
        client: Supabase client
        video_id: UUID of the video
        dive_id: UUID of the dive
        user_id: UUID of the user
        highlights: Enriched highlight dicts from the pipeline
        species_rows: Species table rows for ID lookup

    Returns:
        Summary of what was written
    """
    species_lookup = {sp["common_name"].lower(): sp for sp in species_rows}

    highlights_created = 0
    species_linked = 0

    for highlight in highlights:
        # Upload clip and thumbnail to storage
        clip_storage_path = None
        thumb_storage_path = None

        if highlight.get("local_clip_path") and Path(highlight["local_clip_path"]).exists():
            clip_filename = Path(highlight["local_clip_path"]).name
            clip_storage_path = upload_file_to_storage(
                client, HIGHLIGHTS_BUCKET,
                f"{user_id}/{video_id}/{clip_filename}",
                highlight["local_clip_path"],
            )

        if highlight.get("local_thumbnail_path") and Path(highlight["local_thumbnail_path"]).exists():
            thumb_filename = Path(highlight["local_thumbnail_path"]).name
            thumb_storage_path = upload_file_to_storage(
                client, HIGHLIGHTS_BUCKET,
                f"{user_id}/{video_id}/{thumb_filename}",
                highlight["local_thumbnail_path"],
            )

        # Determine highlight type
        highlight_type = "species_sighting" if highlight.get("species") else "interesting_moment"

        # Insert highlight row
        result = client.table("highlights").insert({
            "video_id": video_id,
            "dive_id": dive_id,
            "user_id": user_id,
            "type": highlight_type,
            "title": highlight.get("title", highlight.get("description", "Highlight")),
            "start_time": highlight["start_time"],
            "end_time": highlight["end_time"],
            "clip_path": clip_storage_path,
            "thumbnail_path": thumb_storage_path,
            "confidence": highlight.get("confidence", 0.0),
        }).execute()

        if not result.data:
            logger.error("Failed to insert highlight")
            continue

        highlight_id = result.data[0]["id"]
        highlights_created += 1

        # Link species to highlight
        for species_name in highlight.get("species", []):
            species_row = species_lookup.get(species_name.lower())
            if not species_row:
                # Try partial match
                for key, sp in species_lookup.items():
                    if species_name.lower() in key or key in species_name.lower():
                        species_row = sp
                        break

            if species_row:
                try:
                    client.table("highlight_species").insert({
                        "highlight_id": highlight_id,
                        "species_id": species_row["id"],
                        "confidence": highlight.get("confidence", 0.0),
                        "bounding_box": highlight.get("bbox"),
                    }).execute()
                    species_linked += 1
                except Exception as e:
                    # Ignore duplicate species links
                    logger.warning("Failed to link species: %s", e)

    return {
        "highlights_created": highlights_created,
        "species_linked": species_linked,
    }


def update_job_progress(
    client: Client,
    job_id: str,
    progress: int,
    status: str = "running",
    result: dict | None = None,
    error: str | None = None,
) -> None:
    """Update a processing_jobs row with current progress."""
    import datetime

    update_data: dict = {"progress": progress, "status": status}
    if result is not None:
        update_data["result"] = result
    if error is not None:
        update_data["error"] = error
    if status == "running" and progress <= 5:
        update_data["started_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if status in ("completed", "failed"):
        update_data["completed_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        client.table("processing_jobs").update(update_data).eq("id", job_id).execute()
    except Exception as e:
        logger.error("Failed to update job progress: %s", e)


def mark_video_processed(client: Client, video_id: str) -> None:
    """Update video status to 'processed'."""
    try:
        client.table("videos").update({"status": "processed"}).eq("id", video_id).execute()
    except Exception as e:
        logger.error("Failed to mark video processed: %s", e)


def mark_video_failed(client: Client, video_id: str, error: str) -> None:
    """Update video status to 'failed'."""
    try:
        client.table("videos").update({"status": "failed"}).eq("id", video_id).execute()
    except Exception as e:
        logger.error("Failed to mark video failed: %s", e)


def trigger_dive_log_generation(
    client: Client,
    supabase_url: str,
    service_key: str,
    dive_id: str,
    user_id: str,
) -> None:
    """Call the generate-dive-log Edge Function."""
    import httpx

    try:
        response = httpx.post(
            f"{supabase_url}/functions/v1/generate-dive-log",
            json={"diveId": dive_id, "userId": user_id},
            headers={
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        response.raise_for_status()
        logger.info("Dive log generation triggered for dive %s", dive_id)
    except Exception as e:
        logger.error("Failed to trigger dive log generation: %s", e)
