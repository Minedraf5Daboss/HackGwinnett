"""Run the server: `python -m app` or `app`."""

import uvicorn

from app.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level,
        reload=settings.env == "development",
        root_path=settings.root_path,
    )


if __name__ == "__main__":
    main()
