.PHONY: install dev backend frontend test lint format migrate seed revision

VENV := backend/.venv/bin

install: backend/.env  ## Install backend and frontend dependencies
	cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
	cd frontend && npm install

backend/.env:  ## Create backend/.env from the example, with a fresh secret key
	sed "s|^APP_SECRET_KEY=.*|APP_SECRET_KEY=$$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')|" \
		backend/.env.example > $@

dev: migrate seed  ## Run the API (port 8000) and the website (port 5173) together
	$(MAKE) -j2 backend frontend

backend:
	cd backend && .venv/bin/app

frontend:
	cd frontend && npm run dev

test:
	cd backend && .venv/bin/pytest
	cd frontend && npm run build

lint:
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .

format:
	cd backend && .venv/bin/ruff check --fix . && .venv/bin/ruff format .

migrate:  ## Apply database migrations
	cd backend && .venv/bin/alembic upgrade head

seed:  ## Load demo accommodations and clinics from backend/src/app/data/
	cd backend && .venv/bin/python -m app.seed

revision:  ## Create a migration from model changes: make revision m="add appointments"
	cd backend && .venv/bin/alembic revision --autogenerate -m "$(m)"
