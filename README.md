# MedAssist

Starter code for a medical assistance app. People can create an account, log in, and keep a
private health profile: allergies, medications, conditions, and an emergency contact.
- **backend/**: Python API built with FastAPI, a SQLite database (SQLAlchemy + Alembic
  migrations), and login with JWT tokens.
- **frontend/**: React website built with Vite and Tailwind CSS.

> This is a hackathon starter, not a certified medical system. Use made-up data, not real
> patient information.

## Get started

You need **Python 3.10+** and **Node.js 20.19+** (check with `python3 --version` and `node --version`).

```bash
make install   # one time: installs everything and creates backend/.env with a secret key
make dev       # starts the API and the website together (Ctrl+C stops both)
```

Then open **http://localhost:5173**. The website forwards `/api` requests to the API on port
8000, so that's the only address you need.

- Interactive API docs: http://localhost:8000/docs. Click **Authorize** and log in with your
  email as the username to try the protected endpoints.
- In VS Code, press **F5** → "API server" to run the API with the debugger.

## Commands

| Command                       | What it does                                         |
|-------------------------------|------------------------------------------------------|
| `make dev`                    | Run the API and the website, both auto-reloading     |
| `make test`                   | Run the backend tests and check the website builds   |
| `make lint` / `make format`   | Check / fix Python code style                        |
| `make migrate`                | Update the database to the latest tables             |
| `make revision m="message"`   | Create a migration after changing `models.py`        |

## API

| Method | Path                     | Login | Description                                  |
|--------|--------------------------|-------|----------------------------------------------|
| GET    | `/health`                |       | Is the API (and its database) up?            |
| POST   | `/api/v1/auth/register`  |       | Create an account (JSON: `email`, `password`)|
| POST   | `/api/v1/auth/token`     |       | Log in (form: `username`, `password`) → token|
| GET    | `/api/v1/users/me`       | ✓     | The logged-in user                           |
| GET    | `/api/v1/profile`        | ✓     | Your health profile                          |
| PATCH  | `/api/v1/profile`        | ✓     | Update some or all profile fields            |

## Project layout

```
backend/
  src/app/
    main.py            # creates the FastAPI app
    config.py          # settings, read from backend/.env
    models.py          # database tables: User, Profile
    schemas.py         # what the API accepts and returns
    security.py        # password hashing and login tokens
    api/routes/        # health, auth, users, profile
  migrations/          # database changes (Alembic)
  tests/               # pytest
frontend/
  src/
    api.js             # calls the backend and attaches the login token
    auth.jsx           # who's logged in: useAuth()
    components/        # layout, buttons, form fields
    pages/             # Home, Login, Register, Profile
```

## Adding a profile field

1. Add a column to `Profile` in `backend/src/app/models.py`.
2. Add the same field to `ProfileUpdate` in `backend/src/app/schemas.py`.
3. Run `make revision m="add blood type"`, then `make migrate`.
4. Add the field to `SECTIONS` in `frontend/src/pages/Profile.jsx`.

Adding a new feature, such as appointments, follows the same steps. Create a new model,
schemas, a route file in `api/routes/` (register it in `api/__init__.py`), and a page in
`frontend/src/pages/` (add it to `App.jsx`).
