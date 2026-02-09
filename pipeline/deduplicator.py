"""Stage 3b: Deduplication using CLIP embeddings.

Generates CLIP embeddings for candidate highlight frames and clusters
visually similar frames to avoid redundant highlights. Includes temporal
diversity enforcement for underwater footage where visual similarity is high.
"""

from __future__ import annotations

import logging

import numpy as np
import torch
from PIL import Image
from sklearn.cluster import AgglomerativeClustering
from transformers import CLIPModel, CLIPProcessor

logger = logging.getLogger(__name__)

TEMPORAL_WINDOW_SECONDS = 30.0  # highlights within this window compete


def load_clip_model(device: str = "cuda") -> tuple[CLIPModel, CLIPProcessor]:
    """Load CLIP model and processor."""
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    model = model.to(device)
    model.eval()
    return model, processor


def compute_embeddings(
    model: CLIPModel,
    processor: CLIPProcessor,
    frame_paths: list[str],
    device: str = "cuda",
    batch_size: int = 32,
) -> np.ndarray:
    """Compute CLIP embeddings for a list of frame images.

    Returns:
        numpy array of shape (N, 512) with L2-normalized embeddings
    """
    all_embeddings = []

    for i in range(0, len(frame_paths), batch_size):
        batch_paths = frame_paths[i : i + batch_size]
        images = []
        for path in batch_paths:
            try:
                img = Image.open(path).convert("RGB")
                images.append(img)
            except Exception as e:
                logger.warning("Failed to load image %s: %s", path, e)
                # Use a blank image as placeholder
                images.append(Image.new("RGB", (640, 360)))

        inputs = processor(images=images, return_tensors="pt", padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            features = model.get_image_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)
            all_embeddings.append(features.cpu().numpy())

    if not all_embeddings:
        return np.array([])

    return np.vstack(all_embeddings)


def deduplicate_highlights(
    candidates: list[dict],
    embeddings: np.ndarray,
    similarity_threshold: float = 0.75,
    min_highlights: int = 5,
    relaxed_threshold: float = 0.70,
) -> list[dict]:
    """Cluster visually similar candidates and keep the best from each cluster.

    Includes temporal diversity: if multiple cluster winners fall within
    TEMPORAL_WINDOW_SECONDS of each other, only the highest-scored survives.

    If dedup produces fewer than min_highlights, retries with relaxed_threshold.

    Args:
        candidates: List of highlight candidates with scores
        embeddings: CLIP embeddings aligned with candidates
        similarity_threshold: Cosine similarity threshold for merging (default 0.75)
        min_highlights: Minimum highlights to produce before relaxing threshold
        relaxed_threshold: Fallback threshold if too few highlights

    Returns:
        Deduplicated list of candidates (best per cluster, temporally diverse)
    """
    if len(candidates) <= 1:
        return candidates

    if embeddings.shape[0] != len(candidates):
        logger.warning(
            "Embedding count (%d) != candidate count (%d), skipping dedup",
            embeddings.shape[0], len(candidates),
        )
        return candidates

    result = _cluster_and_select(candidates, embeddings, similarity_threshold)

    # If too few, retry with relaxed threshold
    if len(result) < min_highlights and len(candidates) >= min_highlights:
        logger.info(
            "Dedup produced %d highlights (< %d minimum), retrying with threshold %.2f",
            len(result), min_highlights, relaxed_threshold,
        )
        result = _cluster_and_select(candidates, embeddings, relaxed_threshold)

    # If still too few, add back highest-scored candidates not yet included
    if len(result) < min_highlights and len(candidates) >= min_highlights:
        result_paths = {c["best_frame_path"] for c in result}
        for c in candidates:
            if c["best_frame_path"] not in result_paths:
                result.append(c)
                result_paths.add(c["best_frame_path"])
            if len(result) >= min_highlights:
                break

    return result


def _cluster_and_select(
    candidates: list[dict],
    embeddings: np.ndarray,
    similarity_threshold: float,
) -> list[dict]:
    """Run clustering at given threshold, then apply temporal diversity."""
    distance_threshold = 1.0 - similarity_threshold

    clustering = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=distance_threshold,
        metric="cosine",
        linkage="average",
    )
    labels = clustering.fit_predict(embeddings)

    # From each cluster, keep the candidate with the highest score
    cluster_best: dict[int, dict] = {}
    for idx, label in enumerate(labels):
        candidate = candidates[idx]
        score = candidate.get("composite_score", 0)
        if label not in cluster_best or score > cluster_best[label].get("composite_score", 0):
            cluster_best[label] = candidate

    deduplicated = sorted(cluster_best.values(), key=lambda c: c.get("composite_score", 0), reverse=True)

    # Temporal diversity: within each TEMPORAL_WINDOW_SECONDS window,
    # keep only the highest-scored highlight
    deduplicated = _enforce_temporal_diversity(deduplicated)

    return deduplicated


def _enforce_temporal_diversity(highlights: list[dict]) -> list[dict]:
    """Remove highlights that are too close in time, keeping the highest-scored."""
    if len(highlights) <= 1:
        return highlights

    # Already sorted by score (descending) — greedily keep each highlight
    # only if it's far enough from all already-kept highlights
    kept = []
    for h in highlights:
        t = h.get("best_timestamp", h.get("start_time", 0))
        too_close = False
        for k in kept:
            kt = k.get("best_timestamp", k.get("start_time", 0))
            if abs(t - kt) < TEMPORAL_WINDOW_SECONDS:
                too_close = True
                break
        if not too_close:
            kept.append(h)

    return kept
