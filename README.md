<<<<<<< HEAD
# HackGwinnett
=======
# app

A Python backend service: FastAPI, SQLAlchemy, Alembic migrations, and JWT auth.

## Quick start

```bash
make install            # create .venv and install dependencies
cp .env.example .env    # then set APP_SECRET_KEY (command is in the file)
make migrate            # create/upgrade the database (SQLite app.db by default)
make dev                # http://127.0.0.1:8000  (auto-reload)
```

- Interactive API docs: http://127.0.0.1:8000/docs. Click **Authorize** and log in with your
  email as the username to call protected endpoints.
- Health check: http://127.0.0.1:8000/health

In VS Code: press **F5** → "API server".

## API

| Method | Path                     | Auth | Description                     |
|--------|--------------------------|------|---------------------------------|
| GET    | `/health`                |      | Liveness + DB check             |
| POST   | `/api/v1/auth/register`  |      | Create an account (JSON)        |
| POST   | `/api/v1/auth/token`     |      | Log in (form: username, password) → bearer token |
| GET    | `/api/v1/users/me`       | ✓    | Current user                    |
| GET    | `/api/v1/items`          | ✓    | List your items (`offset`, `limit`) |
| POST   | `/api/v1/items`          | ✓    | Create an item                  |
| GET    | `/api/v1/items/{id}`     | ✓    | Get an item                     |
| PATCH  | `/api/v1/items/{id}`     | ✓    | Update an item                  |
| DELETE | `/api/v1/items/{id}`     | ✓    | Delete an item                  |

## Common tasks

```bash
make test                        # run tests (in-memory SQLite, no setup needed)
make lint                        # ruff lint + format check
make format                      # auto-fix and format
make revision m="add widgets"    # generate a migration after editing models.py
make migrate                     # apply migrations
```

### Adding a new resource

1. Add a table to `src/app/models.py`.
2. Add request/response models to `src/app/schemas.py`.
3. Add routes in `src/app/api/routes/<name>.py` and register them in `src/app/api/__init__.py`.
4. `make revision m="add <name>"`, review the file in `migrations/versions/`, then `make migrate`.
5. Add tests in `tests/`.

## Configuration

All settings are environment variables prefixed with `APP_` (or a `.env` file). See
`.env.example` and `src/app/config.py`. With `APP_ENV=production` the app refuses to start
using the default secret key.

## Docker (with Postgres)

```bash
export APP_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
docker compose up --build
```

The container runs migrations on startup.

## Layout

```
src/app/
  __main__.py          # `app` / `python -m app`: runs uvicorn
  main.py              # create_app(): engine, middleware, routers
  config.py            # Settings (APP_* env vars)
  db.py                # SQLAlchemy Base + engine factory
  models.py            # database tables
  schemas.py           # pydantic request/response models
  security.py          # password hashing, JWT
  api/
    deps.py            # SessionDep, SettingsDep, CurrentUser
    routes/            # health, auth, users, items
migrations/            # Alembic
tests/                 # pytest; conftest.py has client + auth fixtures
```
>>>>>>> 6390092 (Initial commit)
