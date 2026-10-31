.PHONY: install dev test lint format migrate revision

install:  ## Create venv and install with dev deps
	python3 -m venv .venv
	.venv/bin/pip install -e ".[dev]"

dev:  ## Run the server with auto-reload
	.venv/bin/app

test:
	.venv/bin/pytest

lint:
	.venv/bin/ruff check .
	.venv/bin/ruff format --check .

format:
	.venv/bin/ruff check --fix .
	.venv/bin/ruff format .

migrate:  ## Apply database migrations
	.venv/bin/alembic upgrade head

revision:  ## Create a migration from model changes: make revision m="add widgets"
	.venv/bin/alembic revision --autogenerate -m "$(m)"
