"""FastAPI application factory."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app import __version__
from app.api import api_router
from app.config import Settings, get_settings
from app.db import make_engine

log = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(), format="%(levelname)s %(name)s: %(message)s"
    )
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        log.info("starting %s (%s)", settings.name, settings.env)
        yield
        engine.dispose()

    app = FastAPI(
        title=settings.name,
        version=__version__,
        debug=settings.debug,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = sessionmaker(engine, autoflush=False, expire_on_commit=False)

    # Let a website on another address call the API. In development, any localhost port is
    # allowed, so a frontend run separately (e.g. on port 3000) works with no setup.
    dev_origins = (
        r"http://(localhost|127\.0\.0\.1)(:\d+)?" if settings.env == "development" else None
    )
    if settings.cors_origins or dev_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_origin_regex=dev_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    app.include_router(api_router)
    return app


app = create_app()
