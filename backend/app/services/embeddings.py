import asyncio
import hashlib
import logging
import time
from functools import lru_cache

import numpy as np
from openai import AsyncOpenAI, RateLimitError, APIConnectionError

from app.config import settings
from app.utils.timing import log_perf

logger = logging.getLogger(__name__)

_embedding_cache: dict[str, list[float]] = {}
_MAX_CACHE = 3000


@lru_cache
def _client() -> AsyncOpenAI | None:
    if not settings.github_token:
        return None
    return AsyncOpenAI(
        base_url="https://models.github.io/inference",
        api_key=settings.github_token,
    )


def _cache_key(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


async def embed_text(text: str, *, timeout_ms: int | None = None, use_cache: bool = True) -> list[float] | None:
    # Smarter normalization: remove extra whitespace and newlines
    normalized = " ".join(str(text or "").strip().split())
    if not normalized:
        return None

    key = _cache_key(normalized)
    if use_cache and key in _embedding_cache:
        log_perf("embed.cache_hit", 0, chars=len(normalized))
        return _embedding_cache[key]

    client = _client()
    if client is None:
        return None

    timeout = (timeout_ms or settings.embedding_timeout_ms) / 1000
    
    # Retry logic with exponential backoff
    max_retries = 3
    retry_delay = 0.5

    for attempt in range(max_retries):
        try:
            t0 = time.perf_counter()
            response = await asyncio.wait_for(
                client.embeddings.create(
                    model=settings.embedding_model,
                    input=normalized[:8191], # Model limit is 8192
                ),
                timeout=timeout
            )
            embedding = response.data[0].embedding
            log_perf("embed.api", (time.perf_counter() - t0) * 1000, chars=len(normalized), attempt=attempt + 1)
            
            # Cache the result
            if len(_embedding_cache) >= _MAX_CACHE:
                oldest = next(iter(_embedding_cache))
                del _embedding_cache[oldest]
            _embedding_cache[key] = embedding
            return embedding

        except (RateLimitError, APIConnectionError) as e:
            if attempt == max_retries - 1:
                logger.error("Embedding API failed after %d attempts: %s", max_retries, e)
                raise
            wait = retry_delay * (2 ** attempt)
            logger.warning("Embedding API rate limited/connection error. Retrying in %.1fs...", wait)
            await asyncio.sleep(wait)
        except (TimeoutError, asyncio.TimeoutError):
            log_perf("embed.timeout", settings.embedding_timeout_ms, chars=len(normalized))
            if attempt == max_retries - 1:
                raise TimeoutError(f"Embedding timeout ({settings.embedding_timeout_ms}ms)")
            await asyncio.sleep(0.2)
        except Exception as e:
            logger.exception("Unexpected embedding error: %s", e)
            return None

    return None


def cosine_similarity(vec_a: list[float] | None, vec_b: list[float] | None) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    a = np.asarray(vec_a, dtype=np.float64)
    b = np.asarray(vec_b, dtype=np.float64)
    
    # Normalize vectors to unit length
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))
