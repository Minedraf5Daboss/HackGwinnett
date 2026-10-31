# MedAssist

A medical assistance app focused on accessible care.

- **Accessibility Passport**: save the accommodations you need at appointments (wheelchair
  access, ASL interpreter, low-sensory environment, and more), plus notes.
- **Clinic directory**: search clinics, filter by the accommodations they offer, and sort by
  distance for a map. Each clinic lists its accessibility badges, such as "Roll-in exam table".
- **Plain-language simplifier**: paste medical text and get everyday words back, with a list of
  every term that was changed.
- **Health profile**: allergies, medications, conditions, and an emergency contact.

> The clinics are **fictional demo data** (phone numbers use the reserved 555-01xx range).
> Nothing in this app is medical advice.

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

### In the workshop's browser editor

The workshop editor only shows apps on port 8081, at `https://<your-editor>.cloudfront.net/app/`.
To use it, create `frontend/.env.local` with:

```
BASE_PATH=/app/
PORT=8081
ALLOWED_HOSTS=.cloudfront.net
HMR_CLIENT_PORT=443
```

and add `APP_ROOT_PATH=/app` to `backend/.env`. Then run `make dev`. The site is at `/app/`
and the API docs are at `/app/docs`.

## Commands

| Command                       | What it does                                         |
|-------------------------------|------------------------------------------------------|
| `make dev`                    | Run the API and the website, both auto-reloading     |
| `make test`                   | Run the backend tests and check the website builds   |
| `make lint` / `make format`   | Check / fix Python code style                        |
| `make migrate`                | Update the database to the latest tables             |
| `make seed`                   | Reload the demo clinics and accommodation types      |
| `make revision m="message"`   | Create a migration after changing `models.py`        |

## API

**Building the frontend? See [docs/API.md](docs/API.md)** for how logging in works, every
endpoint with example responses, and how errors look.

| Method | Path                     | Login | Description                                  |
|--------|--------------------------|-------|----------------------------------------------|
| GET    | `/health`                |       | Is the API (and its database) up?            |
| POST   | `/api/v1/auth/register`  |       | Create an account (JSON: `email`, `password`)|
| POST   | `/api/v1/auth/token`     |       | Log in (form: `username`, `password`) → token|
| POST   | `/api/v1/auth/2fa/verify` |      | Second login step when 2FA is on (code)      |
| POST   | `/api/v1/auth/2fa/setup` | ✓     | Start 2FA setup: QR code for an authenticator app |
| POST   | `/api/v1/auth/2fa/enable` | ✓    | Turn 2FA on with a code → recovery codes     |
| POST   | `/api/v1/auth/2fa/disable` | ✓   | Turn 2FA off (password + code)               |
| GET    | `/api/v1/users/me`       | ✓     | The logged-in user                           |
| GET    | `/api/v1/profile`        | ✓     | Your health profile                          |
| PATCH  | `/api/v1/profile`        | ✓     | Update some or all profile fields            |
| GET    | `/api/v1/passport`       | ✓     | Your Accessibility Passport                  |
| PUT    | `/api/v1/passport`       | ✓     | Save it (JSON: `accommodations` ids, `notes`)|
| GET    | `/api/v1/passport/matches` | ✓   | Clinics ranked by how well they fit your passport |
| POST   | `/api/v1/passport/share` | ✓     | Turn on a read-only share link               |
| DELETE | `/api/v1/passport/share` | ✓     | Turn the share link off                      |
| GET    | `/api/v1/shared-passports/{token}` | | A shared passport (anyone with the link) |
| GET    | `/api/v1/accommodations` |       | All accommodation types, with categories     |
| GET    | `/api/v1/clinics`        |       | Search, filter, rank by needs, sort by distance |
| GET    | `/api/v1/clinics/types`  |       | Clinic types, for a filter dropdown          |
| GET    | `/api/v1/clinics/{id}`   |       | One clinic with its badges                   |
| POST   | `/api/v1/simplify`       |       | Simplify medical text (JSON: `text`)         |

## Demo data

The accommodation types, clinics, and simplifier glossary are JSON files in
`backend/src/app/data/`. Edit them to add clinics or jargon terms:

- After changing `accommodations.json` or `clinics.json`, run `make seed` (`make dev` does it
  for you). Saved passports are kept.
- `glossary.json` is read when the API starts. Mark abbreviations `"case_sensitive": true`
  so that, for example, "BID" (twice a day) is replaced but "bid" isn't.

## Project layout

```
backend/
  src/app/
    main.py            # creates the FastAPI app
    config.py          # settings, read from backend/.env
    models.py          # database tables: users, profiles, passports, clinics, ...
    schemas.py         # what the API accepts and returns
    security.py        # password hashing and login tokens
    simplifier.py      # the plain-language simplifier
    seed.py            # loads data/*.json into the database
    data/              # accommodation types, demo clinics, jargon glossary
    api/routes/        # one file per group of endpoints
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
