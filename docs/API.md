# MedAssist API guide (for the frontend)

Everything the website needs from the backend: where it is, how logging in works, and each
endpoint with a real example. To try any endpoint in the browser, open the interactive docs
(`/docs`, see below), click **Try it out**, and **Execute**.

## Where the API is

All endpoints start with `/api/v1`. Send and receive JSON.

| How you run it | API base URL | Interactive docs |
|---|---|---|
| `make dev` on a laptop, calling from `frontend/` | `/api/v1` (the site forwards it) | http://localhost:5173/docs |
| `make dev` on a laptop, your own separate frontend | `http://localhost:8000/api/v1` | http://localhost:8000/docs |
| The workshop's browser editor | `https://<editor>.cloudfront.net/app/api/v1` | `…/app/docs` |

A separate frontend on any `localhost` port can call the API directly during development.
For a site hosted anywhere else, add its address to `APP_CORS_ORIGINS` in `backend/.env`,
for example `APP_CORS_ORIGINS=["https://our-site.example"]`, and restart the API.

**Working in `frontend/`?** You don't need raw `fetch` calls. `src/api.js` has
`api(path, { method, body })`, which adds the login token for you, and `src/auth.jsx` has
`useAuth()` with `user`, `login`, `register`, and `logout`.

## Logging in

1. **Sign up:** `POST /auth/register` with JSON `{"email": "...", "password": "..."}`
   (8+ characters). Returns `201`, or `409` if the email is taken.
2. **Log in:** `POST /auth/token` with **form fields** (not JSON) `username` (the email) and
   `password`. Returns `{"access_token": "eyJ...", "token_type": "bearer"}`, or `401`.
3. **Send the token** on every endpoint marked 🔒 below, in the header
   `Authorization: Bearer <access_token>`.

```js
const res = await fetch(`${API}/auth/token`, {
  method: 'POST',
  body: new URLSearchParams({ username: email, password }),
});
const { access_token } = await res.json();

const me = await fetch(`${API}/users/me`, {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
```

Tokens last 60 minutes. A `401` from a 🔒 endpoint means the token expired or is missing:
send the user back to the login page.

## Accessibility Passport

The accommodations a user needs at appointments. Accommodations are referred to by `id`,
such as `"asl-interpreter"`.

**`GET /accommodations`** lists all 15 accommodation types, in display order. Group them by
`category` (Mobility, Communication, Sensory, Scheduling & support) for the passport form.

```json
[
  {
    "id": "wheelchair-access",
    "label": "Wheelchair accessible",
    "category": "Mobility",
    "description": "Step-free entrance, doorways, and hallways wide enough for a wheelchair."
  },
  ...
]
```

**🔒 `GET /passport`** returns the user's passport. Before the first save it's empty, with
`updated_at: null`.

**🔒 `PUT /passport`** saves it, replacing what was there. Each accommodation is a
**must-have** or **nice-to-have**. A plain id is a must-have. For a nice-to-have, send
`{"id": ..., "must_have": false}` instead:

```json
{
  "accommodations": ["asl-interpreter", { "id": "low-sensory", "must_have": false }],
  "notes": "Please text me."
}
```

Both endpoints return the accommodations in display order, each with `must_have`:

```json
{
  "accommodations": [
    { "id": "asl-interpreter", "label": "ASL interpreter", "category": "Communication",
      "description": "American Sign Language interpreter, in person or by video.",
      "must_have": true },
    { "id": "low-sensory", "label": "Low-sensory environment", "category": "Sensory",
      "description": "Quiet room, dimmable lights, and little background noise.",
      "must_have": false }
  ],
  "notes": "Please text me.",
  "updated_at": "2026-10-31T16:28:15",
  "share_token": null,
  "share_include_name": true
}
```

An unknown id returns `422` with `"detail": "Unknown accommodation: ..."`.

### Share link

A read-only view of the passport that anyone with the link can open, for showing clinic staff.

- **🔒 `POST /passport/share`**, with an optional body `{"include_name": false}` to hide the
  user's name (it's shown by default). Returns `{"token": "VMkqoqyKOzT8VgG3tpcF2w",
  "include_name": true}`. Calling it again keeps the same token. Returns `409` if the
  passport hasn't been saved yet.
- **🔒 `DELETE /passport/share`** turns the link off. Returns `204`.
- **`GET /shared-passports/{token}`** (no login) returns the shared passport, or `404` once
  the link is off:

```json
{
  "name": "Ada Patient",
  "accommodations": [
    { "id": "asl-interpreter", "label": "ASL interpreter", ..., "must_have": true }
  ],
  "notes": "Please text me.",
  "updated_at": "2026-10-31T16:28:15"
}
```

The API only provides the token. Make a page on the website, for example
`/shared/:token`, that calls this endpoint, and share that page's URL. `GET /passport`
includes `share_token` and `share_include_name`, so you can show whether sharing is on and
whether the name is shown.

## Clinic directory

**`GET /clinics`** (no login) searches the directory. All query parameters are optional:

| Parameter | Example | What it does |
|---|---|---|
| `q` | `dental` | Searches names, types, cities, ZIP codes, and badge names |
| `type` | `Dental` | One clinic type (the list is at `GET /clinics/types`) |
| `accommodations` | `wheelchair-access,asl-interpreter` | **Filters:** only clinics offering all of them |
| `needs` | `asl-interpreter,low-sensory` | **Ranks** by these must-haves: best matches first, adds `match`; nothing is filtered out |
| `nice_to_have` | `extended-appointments` | **Ranks** too, but missing one matters less than missing a must-have |
| `lat`, `lng` | `33.96`, `-83.99` | Sorts by distance and fills in `distance_miles` (pass both) |

Results are sorted by name, or by distance with `lat`/`lng`. With `needs` or `nice_to_have`,
the clinics missing the fewest must-haves come first, then those with the highest `score`,
with ties broken by distance or name. A clinic that has every must-have ranks above one that
misses a must-have, even if the second clinic offers more nice-to-haves. Each clinic:

```json
{
  "id": "bluebird-hearing-speech",
  "name": "Bluebird Hearing & Speech",
  "type": "Audiology",
  "street": "18 Bluebird Trl", "city": "Sugar Hill", "state": "GA", "zip": "30518",
  "phone": "(770) 555-0111",
  "hours": "Mon-Thu 9am-5pm",
  "latitude": 34.1082,
  "longitude": -84.0312,
  "accommodations": [
    { "id": "asl-interpreter", "label": "ASL interpreter", "category": "Communication",
      "note": "ASL-fluent audiologist on staff" },
    { "id": "hearing-loop", "label": "Hearing loop", "category": "Sensory",
      "note": "In every room" },
    ...
  ],
  "distance_miles": 7.7,
  "match": {
    "met": ["asl-interpreter"],
    "missing": ["low-sensory"],
    "missing_must_haves": ["low-sensory"],
    "score": 0.5
  }
}
```

- `accommodations` are the clinic's **badges**: show `label`, and `note` when it's not null.
- `latitude`/`longitude` are ready for a map (e.g. Leaflet markers).
- `distance_miles` is `null` without `lat`/`lng`, and `match` is `null` without `needs` or
  `nice_to_have`. `score` runs from 0 to 1 and counts both kinds, so 0.5 means "meets 1 of
  your 2 needs". `missing_must_haves` is empty when the clinic has every must-have, which is
  a good cue for a "Meets all your must-haves" label.

**🔒 `GET /passport/matches`** is the same search, ranked by the user's saved passport (its
must-haves and nice-to-haves), with no need to pass `needs` or `nice_to_have`. It takes the
other `GET /clinics` parameters. With an empty passport, nothing is ranked and `match` is
`null`.

**`GET /clinics/{id}`** returns one clinic (`404` if unknown), and **`GET /clinics/types`**
returns the clinic types, e.g. `["Audiology", "Behavioral health", "Dental", ...]`.

The 12 clinics are fictional demo data around Gwinnett County.

## Plain-language simplifier

**`POST /simplify`** (no login), with `{"text": "Take an analgesic BID for arthralgia."}`
(1 to 5000 characters):

```json
{
  "simplified": "Take a pain reliever twice a day for joint pain.",
  "terms": [
    { "term": "analgesic", "plain": "pain reliever", "count": 1 },
    { "term": "BID", "plain": "twice a day", "count": 1 },
    { "term": "arthralgia", "plain": "joint pain", "count": 1 }
  ]
}
```

`terms` lists every jargon term that was replaced, in order of appearance. It's handy for a
"what changed" glossary under the result. An empty `terms` list means nothing was replaced.

## Health profile

**🔒 `GET /profile`** and **🔒 `PATCH /profile`**: `full_name`, `date_of_birth`
(`"YYYY-MM-DD"`), `phone`, `emergency_contact_name`, `emergency_contact_phone`, `allergies`,
`medications`, `conditions`. `PATCH` changes only the fields you send; an empty string clears
a field.

## Errors

Errors come back as JSON with a `detail` field, in one of two forms:

- **A message string**, which you can show as is: `{"detail": "Clinic not found"}`
- **A list of form errors** (status `422`), one per invalid field. `loc` ends with the field
  name:

```json
{ "detail": [
  { "loc": ["body", "email"], "msg": "value is not a valid email address: ..." },
  { "loc": ["body", "password"], "msg": "String should have at least 8 characters" }
] }
```

| Status | Meaning |
|---|---|
| `401` | Not logged in, or the token expired |
| `404` | Not found (or a share link that's turned off) |
| `409` | Conflict: email already registered, or sharing a passport that isn't saved |
| `422` | Invalid input; see `detail` |
