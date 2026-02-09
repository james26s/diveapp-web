"""Stage 2: Frame analysis using Gemini 2.5 Flash.

Sends all extracted frames to Gemini for species identification and interest scoring.
Replaces both YOLO species detection and the separate Gemini interest scoring stage.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from pathlib import Path

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT = """You are analyzing frames from an underwater scuba diving video.
For each image, provide:
1. An interest score from 1-10 (10 = most visually striking/exciting)
2. A list of marine species visible (be as specific as possible — use common names like "Green Sea Turtle", "Leather Coral", "Moray Eel", "Clownfish")
3. A short description (1 sentence) of what makes the frame interesting

Consider these factors for scoring:
- Proximity and size of marine life (closer/larger = higher score)
- Rarity of species (manta ray, whale shark > common reef fish)
- Composition and visual appeal
- Action or behavior (feeding, cleaning, hunting = higher)
- Color and contrast
- Multiple species in frame
- Divers alone with no marine life = score 2-3 max

Be precise with species identification. Do NOT guess generic categories — if you see a specific species, name it.
If the frame shows only open water, sand, or distant reef with no identifiable subjects, score it 1-2.

Return a JSON array with one object per image in the same order:
[
  {
    "frame_id": "the frame_id provided",
    "interest_score": 8,
    "species": ["Green Sea Turtle", "Remora"],
    "description": "Large sea turtle swimming directly toward camera with two remoras attached"
  }
]

Return ONLY valid JSON, no markdown formatting."""


def create_client(api_key: str) -> genai.Client:
    """Create Gemini API client."""
    return genai.Client(api_key=api_key)


async def analyze_frames(
    client: genai.Client,
    frames: list[dict],
    batch_size: int = 15,
    max_concurrent: int = 5,
) -> list[dict]:
    """Analyze all frames for species and visual interest using Gemini.

    Sends every frame to Gemini (no pre-filtering with YOLO). This gives
    accurate species identification without COCO false positives.

    Args:
        client: Gemini API client
        frames: All extracted frames [{path, timestamp, source}, ...]
        batch_size: Frames per API call
        max_concurrent: Max concurrent API calls

    Returns:
        List of {frame_idx, interest_score, species, description}
    """
    if not frames:
        return []

    frames_to_score = [{"frame_idx": idx, **frame} for idx, frame in enumerate(frames)]

    # Split into batches
    batches = [
        frames_to_score[i : i + batch_size]
        for i in range(0, len(frames_to_score), batch_size)
    ]

    logger.info("Analyzing %d frames in %d batches (batch_size=%d, max_concurrent=%d)",
                len(frames_to_score), len(batches), batch_size, max_concurrent)

    # Process batches with concurrency limit
    semaphore = asyncio.Semaphore(max_concurrent)
    tasks = [_analyze_batch(client, batch, semaphore) for batch in batches]
    batch_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Flatten results
    results = []
    for result in batch_results:
        if isinstance(result, Exception):
            logger.error("Batch analysis failed: %s", result)
            continue
        results.extend(result)

    return results


async def _analyze_batch(
    client: genai.Client,
    batch: list[dict],
    semaphore: asyncio.Semaphore,
    max_retries: int = 3,
) -> list[dict]:
    """Analyze a single batch of frames."""
    async with semaphore:
        # Build multimodal content with images
        content_parts = []

        for frame in batch:
            frame_path = Path(frame["path"])
            if not frame_path.exists():
                continue

            img_data = frame_path.read_bytes()

            frame_id = f"frame_{frame['frame_idx']}"

            content_parts.append(
                types.Part.from_text(text=f"Frame ID: {frame_id} (timestamp: {frame['timestamp']:.1f}s)")
            )
            content_parts.append(
                types.Part.from_bytes(data=img_data, mime_type="image/jpeg")
            )

        content_parts.append(types.Part.from_text(text=ANALYSIS_PROMPT))

        for attempt in range(max_retries):
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-2.5-flash",
                    contents=content_parts,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )

                text = response.text.strip()
                parsed = json.loads(text)

                # Map results back to frame indices
                results = []
                for item in parsed:
                    fid = item.get("frame_id", "")
                    try:
                        fidx = int(fid.split("_")[1])
                    except (IndexError, ValueError):
                        continue

                    results.append({
                        "frame_idx": fidx,
                        "interest_score": min(10, max(1, item.get("interest_score", 5))),
                        "species": item.get("species", []),
                        "description": item.get("description", ""),
                    })

                return results

            except (json.JSONDecodeError, KeyError) as e:
                logger.warning("Batch parse error (attempt %d): %s", attempt + 1, e)
                if attempt == max_retries - 1:
                    return [
                        {"frame_idx": f["frame_idx"], "interest_score": 5, "species": [], "description": ""}
                        for f in batch
                    ]
            except Exception as e:
                logger.warning("Gemini API error (attempt %d): %s", attempt + 1, e)
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    return [
                        {"frame_idx": f["frame_idx"], "interest_score": 5, "species": [], "description": ""}
                        for f in batch
                    ]

    return []
