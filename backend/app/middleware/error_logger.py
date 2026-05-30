import logging
import traceback
from datetime import datetime
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.db.mongo import get_db

logger = logging.getLogger(__name__)

class MongoErrorLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            db = get_db()
            error_log = {
                "timestamp": datetime.utcnow(),
                "path": request.url.path,
                "method": request.method,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
            try:
                await db.error_logs.insert_one(error_log)
            except Exception as db_err:
                logger.error("Could not write to MongoDB: %s", db_err)
            raise e
