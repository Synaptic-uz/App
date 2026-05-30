import logging
import time
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from typing import Any

logger = logging.getLogger("synaptic.perf")


def _fmt_ms(ms: float) -> str:
    if ms < 1:
        return f"{ms * 1000:.0f}µs"
    if ms < 1000:
        return f"{ms:.1f}ms"
    return f"{ms / 1000:.2f}s"


@contextmanager
def timed(stage: str, *, extra: dict[str, Any] | None = None) -> Iterator[dict[str, float]]:
    """Log elapsed time for a sync block. Yields a dict to store sub-ms if needed."""
    meta = extra or {}
    start = time.perf_counter()
    try:
        yield {"start": start}
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        suffix = " | ".join(f"{k}={v}" for k, v in meta.items()) if meta else ""
        msg = f"[perf] {stage} {_fmt_ms(elapsed_ms)}"
        if suffix:
            msg = f"{msg} | {suffix}"
        logger.info(msg)


@asynccontextmanager
async def timed_async(stage: str, *, extra: dict[str, Any] | None = None) -> AsyncIterator[dict[str, float]]:
    meta = extra or {}
    start = time.perf_counter()
    try:
        yield {"start": start}
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        suffix = " | ".join(f"{k}={v}" for k, v in meta.items()) if meta else ""
        msg = f"[perf] {stage} {_fmt_ms(elapsed_ms)}"
        if suffix:
            msg = f"{msg} | {suffix}"
        logger.info(msg)


def log_perf(stage: str, elapsed_ms: float, **extra: Any) -> None:
    suffix = " | ".join(f"{k}={v}" for k, v in extra.items()) if extra else ""
    msg = f"[perf] {stage} {_fmt_ms(elapsed_ms)}"
    if suffix:
        msg = f"{msg} | {suffix}"
    logger.info(msg)
