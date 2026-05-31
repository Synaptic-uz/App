import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import agents, analytics, auth, campaigns, enrich, match, misc, wallet
from app.config import settings
from app.db.mongo import close_db, connect_db
from app.db.qdrant import close_qdrant
from app.middleware.error_logger import MongoErrorLoggerMiddleware, log_error_to_db
from app.middleware.perf import PerfLoggingMiddleware
from app.services.campaign_cache import bootstrap_ranking_stats, load_campaign_cache
from app.services.vector_store import ensure_collection, sync_all_from_mongo
from app.utils.logger import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
DASHBOARD_DIST = ROOT / "dashboard" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await connect_db()
        logger.info("MongoDB connected")
        await load_campaign_cache(force=True)
        await bootstrap_ranking_stats()
        if await ensure_collection():
            synced = await sync_all_from_mongo()
            logger.info("VectorDB indexed %s campaigns", synced)
        logger.info("Campaign cache + ranking stats loaded")
    except Exception as err:
        logger.warning("Startup partial — DB/cache: %s", err)
    yield
    await close_qdrant()
    await close_db()


from app.middleware.i18n_middleware import I18nMiddleware
from app.utils.response import AppResponse, AppException
from fastapi import HTTPException, Request

app = FastAPI(
    title="Synaptic AI",
    description="FastAPI backend — full API + AI matching",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(I18nMiddleware)
app.add_middleware(PerfLoggingMiddleware)
app.add_middleware(MongoErrorLoggerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    # Log warnings for business errors, errors for server-side AppExceptions
    level = "WARNING" if exc.http_status < 500 else "ERROR"
    await log_error_to_db(request, exc, level=level)
    return AppResponse.error(
        message=exc.message,
        status_code=exc.status_code,
        http_status=exc.http_status,
        data=exc.data
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 400:
         await log_error_to_db(request, exc, level="WARNING" if exc.status_code < 500 else "ERROR")
    return AppResponse.error(
        message=str(exc.detail),
        status_code=f"errors.http_{exc.status_code}",
        http_status=exc.status_code
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    await log_error_to_db(request, exc, level="ERROR")
    return AppResponse.error(
        message="Internal server error",
        status_code="errors.serverError",
        http_status=500
    )

app.include_router(auth.router)
app.include_router(wallet.router)
app.include_router(campaigns.router)
app.include_router(agents.router)
app.include_router(enrich.router)
app.include_router(analytics.router)
app.include_router(misc.router)
app.include_router(match.router)

if DASHBOARD_DIST.joinpath("index.html").exists():
    app.mount("/assets", StaticFiles(directory=DASHBOARD_DIST / "assets"), name="assets")
    logger.info("Dashboard static: %s", DASHBOARD_DIST)

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        from fastapi.responses import FileResponse

        if full_path.startswith("api/"):
            from fastapi import HTTPException

            raise HTTPException(404)
        file_path = DASHBOARD_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DASHBOARD_DIST / "index.html")


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False)


if __name__ == "__main__":
    main()
