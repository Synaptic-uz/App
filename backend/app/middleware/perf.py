import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.utils.timing import _fmt_ms

logger = logging.getLogger("synaptic.perf")


class PerfLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000

        path = request.url.path
        method = request.method
        status = response.status_code
        client = request.client.host if request.client else "-"

        logger.info(
            "[perf] HTTP %s %s → %s %s | client=%s",
            method,
            path,
            status,
            _fmt_ms(elapsed_ms),
            client,
        )
        response.headers["X-Response-Time"] = _fmt_ms(elapsed_ms)
        return response
