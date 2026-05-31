import logging
import traceback
from datetime import datetime
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.db.mongo import get_db

logger = logging.getLogger(__name__)

async def log_error_to_db(request: Request, error: Exception, level: str = "ERROR"):
    """Centralized function to log errors to MongoDB."""
    try:
        db = get_db()
        tb = traceback.format_exc() if level == "ERROR" else None
        
        # Extract metadata
        meta = {
            "query": dict(request.query_params),
            "user_agent": request.headers.get("user-agent"),
            "referer": request.headers.get("referer"),
        }
        
        error_log = {
            "timestamp": datetime.utcnow(),
            "level": level,
            "path": request.url.path,
            "method": request.method,
            "error_type": type(error).__name__,
            "error_msg": str(error),
            "traceback": tb,
            "meta": meta
        }
        
        await db.error_logs.insert_one(error_log)
    except Exception as db_err:
        logger.error("Failed to write error log to MongoDB: %s", db_err)

class MongoErrorLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            await log_error_to_db(request, e, level="ERROR")
            raise e
