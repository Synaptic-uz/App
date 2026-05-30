import asyncio
import hashlib
import logging
import time
from functools import lru_cache

import numpy as np
from openai import AsyncOpenAI

from app.config import settings
from app.utils.timing import log_perf

logger = logging.getLogger(__name__)

_embedding_cache: dict[str, list[float]] = {}
_MAX_CACHE = 2000


@lru_cache
def _client() -> AsyncOpenAI | None:
    if not settings.github_token:
        return None
    return AsyncOpenAI(
        base_url="https://models.github.ai/inference",
        api_key=settings.github_token,
    )


def _cache_key(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


async def embed_text(text: str, *, timeout_ms: int | None = None) -> list[float] | None:
    normalized = " ".join(str(text or "").strip().split())
    if not normalized:
        return None

    key = _cache_key(normalized)
    if key in _embedding_cache:
        log_perf("embed.cache_hit", 0, chars=len(normalized))
        return _embedding_cache[key]

    client = _client()
    if client is None:
        return None

    timeout = (timeout_ms or settings.embedding_timeout_ms) / 1000

    async def _request() -> list[float]:
        response = await client.embeddings.create(
            model=settings.embedding_model,
            input=normalized[:8000],
        )
        return response.data[0].embedding

    try:
        t0 = time.perf_counter()
        embedding = await asyncio.wait_for(_request(), timeout=timeout)
        log_perf("embed.api", (time.perf_counter() - t0) * 1000, chars=len(normalized))
    except (TimeoutError, asyncio.TimeoutError):
        log_perf("embed.timeout", settings.embedding_timeout_ms, chars=len(normalized))
        raise TimeoutError(f"Embedding timeout ({timeout_ms or settings.embedding_timeout_ms}ms)")

    if len(_embedding_cache) >= _MAX_CACHE:
        oldest = next(iter(_embedding_cache))
        del _embedding_cache[oldest]
    _embedding_cache[key] = embedding
    return embedding


def cosine_similarity(vec_a: list[float] | None, vec_b: list[float] | None) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    a = np.asarray(vec_a, dtype=np.float64)
    b = np.asarray(vec_b, dtype=np.float64)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
