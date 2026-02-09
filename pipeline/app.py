"""Modal app definition for the DiveApp AI processing pipeline.

Defines the container image, GPU requirements, and web endpoint
that receives processing requests from the Supabase Edge Function.
"""

import logging
import os
import tempfile

import modal

logger = logging.getLogger(__name__)

# --- Modal app setup ---
app = modal.App("diveapp-pipeline")

# Container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "google-genai>=1.0.0",
        "transformers>=4.45.0",
        "torch>=2.4.0",
        "supabase>=2.10.0",
        "httpx>=0.27.0",
        "scikit-learn>=1.5.0",
        "hdbscan>=0.8.0",
        "Pillow>=10.0.0",
        "numpy>=1.26.0",
    )
    .copy_local_file("frame_extractor.py", "/root/frame_extractor.py")
    .copy_local_file("video_analyzer.py", "/root/video_analyzer.py")
    .copy_local_file("deduplicator.py", "/root/deduplicator.py")
    .copy_local_file("clip_generator.py", "/root/clip_generator.py")
    .copy_local_file("supabase_writer.py", "/root/supabase_writer.py")
    .copy_local_file("processor.py", "/root/processor.py")
)


@app.function(
    image=image,
    gpu="A10G",
    timeout=1800,  # 30 minutes max
    secrets=[
        modal.Secret.from_name("supabase-secrets"),
        modal.Secret.from_name("gemini-secrets"),
    ],
)
def process_video_task(
    video_id: str,
    dive_id: str,
    user_id: str,
    job_id: str,
    signed_url: str,
) -> dict:
    """Download video and run the full processing pipeline.

    Called by the web endpoint. Runs on A10G GPU.
    """
    import sys
    sys.path.insert(0, "/root")

    import httpx
    from processor import process_video
    from supabase_writer import create_supabase_client, update_job_progress

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    gemini_key = os.environ["GOOGLE_AI_API_KEY"]

    sb = create_supabase_client(supabase_url, supabase_key)

    # Download video from signed URL
    update_job_progress(sb, job_id, 2, "running")
    logger.info("Downloading video %s", video_id)

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        video_path = tmp.name
        with httpx.stream("GET", signed_url, timeout=300, follow_redirects=True) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes(chunk_size=8192):
                tmp.write(chunk)

    update_job_progress(sb, job_id, 5, "running")
    logger.info("Video downloaded to %s", video_path)

    try:
        result = process_video(
            video_path=video_path,
            video_id=video_id,
            dive_id=dive_id,
            user_id=user_id,
            job_id=job_id,
            supabase_url=supabase_url,
            supabase_service_key=supabase_key,
            gemini_api_key=gemini_key,
        )
        return result
    finally:
        # Clean up downloaded video
        try:
            os.unlink(video_path)
        except OSError:
            pass


@app.function(image=image)
@modal.web_endpoint(method="POST")
def process_video_endpoint(request: dict) -> dict:
    """HTTP endpoint that receives processing requests from the Edge Function.

    Expected payload:
    {
        "video_id": "uuid",
        "dive_id": "uuid",
        "user_id": "uuid",
        "job_id": "uuid",
        "signed_url": "https://..."
    }
    """
    required = ["video_id", "dive_id", "user_id", "job_id", "signed_url"]
    missing = [f for f in required if f not in request]
    if missing:
        return {"error": f"Missing fields: {', '.join(missing)}", "status": 400}

    # Spawn the GPU task asynchronously
    call = process_video_task.spawn(
        video_id=request["video_id"],
        dive_id=request["dive_id"],
        user_id=request["user_id"],
        job_id=request["job_id"],
        signed_url=request["signed_url"],
    )

    return {
        "status": "accepted",
        "message": f"Processing started for video {request['video_id']}",
        "call_id": call.object_id,
    }
