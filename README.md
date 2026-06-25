# PostmanClone

A full-stack API client built from scratch — send real HTTP requests, organize collections, manage environments with `{{variables}}`, and track history. Inspired by Postman.

**Live Demo → [nikhil-postman.vercel.app](https://nikhil-postman.vercel.app)**  
**Backend API → [nikhil-postman.onrender.com](https://nikhil-postman.onrender.com)**  
**API Docs (Swagger) → [nikhil-postman.onrender.com/docs](https://nikhil-postman.onrender.com/docs)**

---

## What it does

- Send real HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) — the backend proxies them via `aiohttp` so you never hit browser CORS issues
- Organize requests into **Collections** and **Folders**
- Use **Environments** with `{{variable}}` syntax resolved at send time — switch between dev/staging/prod in one click
- Every request is logged to **History** — re-open any past request from the sidebar
- Generate **code snippets** for cURL, Fetch, Python, and Node.js
- **Export / Import** Postman Collection v2.1 JSON — fully compatible with real Postman
- Multiple open **Tabs** with unsaved-change indicators
- Resizable sidebar and response panel

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, App Router |
| Backend | Python 3, FastAPI, SQLAlchemy ORM |
| Database | SQLite (file-based, zero config) |
| HTTP Proxy | aiohttp (async, bypasses CORS) |
| State | React Context + useReducer |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Running locally

**Prerequisites:** Node.js 18+, Python 3.10+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Starts at `http://localhost:8000`. On first run it creates `postman_clone.db` and seeds sample collections and environments so the app is immediately usable.

Interactive API docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Starts at `http://localhost:3000`. The backend URL defaults to `localhost:8000` — no extra config needed for local dev.

---

## Environment Variables

Only one variable is needed, and only for production:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `https://nikhil-postman.onrender.com`) |

For local development this falls back to `http://localhost:8000` automatically.

---

## Project Structure

```
├── backend/
│   ├── main.py              # All API routes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # SQLite engine + session
│   ├── runner.py            # HTTP proxy executor (aiohttp)
│   ├── resolver.py          # {{variable}} substitution
│   ├── snippet_generator.py # Code snippet output
│   ├── seed.py              # One-time database seeder
│   └── requirements.txt
│
└── frontend/
    └── app/
        ├── page.tsx               # Root — wires everything together
        ├── layout.tsx
        ├── globals.css            # Dark theme CSS variables
        ├── types/index.ts         # TypeScript type definitions
        ├── lib/
        │   ├── api.ts             # All backend API calls (axios)
        │   ├── store.tsx          # Global state
        │   └── utils.ts           # URL builder, formatters
        └── components/
            ├── TopBar.tsx
            ├── TabBar.tsx
            ├── sidebar/
            ├── request/           # URL bar, KV editor, body, auth
            ├── response/          # Response viewer
            ├── modals/
            └── ui/                # Shared components
```

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/workspaces` | List workspaces |
| GET | `/workspaces/{id}/collections` | Collections with nested folders + requests |
| POST | `/collections` | Create collection |
| PATCH | `/collections/{id}` | Rename collection |
| DELETE | `/collections/{id}` | Delete collection (cascades) |
| POST/PATCH/DELETE | `/folders/{id}` | Folder CRUD |
| POST | `/requests` | Save a request |
| PATCH/DELETE | `/requests/{id}` | Update or delete |
| GET | `/workspaces/{id}/environments` | Environments with variables |
| POST | `/environments` | Create environment |
| PUT | `/environments/{id}/variables` | Replace all variables |
| GET | `/history` | Recent history |
| DELETE | `/history` | Clear history |
| **POST** | **`/run`** | **Send HTTP request (core feature)** |
| GET | `/collections/{id}/export` | Export as Postman JSON |
| POST | `/collections/import` | Import Postman JSON |
| POST | `/snippet` | Generate code snippet |
| GET | `/health` | Health check |

Full interactive docs at [nikhil-postman.onrender.com/docs](https://nikhil-postman.onrender.com/docs).

---

## Database Schema

```
Workspaces
  └── Collections
        ├── Folders
        │     └── Requests
        │           ├── Headers
        │           └── QueryParams
        └── Requests (direct, no folder)
              ├── Headers
              └── QueryParams
  └── Environments
        └── Variables

History (standalone — every Send click, including unsaved requests)
```

A few design decisions worth noting:

- `request_id` in History is nullable — ad-hoc sends are still fully logged
- `environment_name` is snapshotted so history stays readable after an environment is deleted
- `is_active` on headers, params, and variables lets users toggle rows without deleting them
- `is_secret` on variables masks API keys in the UI
- `auth_data` is stored as JSON — handles bearer / basic / API key without extra tables

---

## Deployment

### Backend — Render

1. New Web Service → connect GitHub repo
2. Root directory: `backend`
3. Build command: `pip install --prefer-binary -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend — Vercel

1. Import GitHub repo → set root directory to `frontend`
2. Add environment variable: `NEXT_PUBLIC_API_URL=https://nikhil-postman.onrender.com`
3. Deploy

---

## Assumptions

- Single default user — no authentication, assumed logged in as per the assignment spec
- SQLite for simplicity; swappable for PostgreSQL by changing the SQLAlchemy connection string
- SSL verification disabled in the runner (`ssl=False`) for dev convenience
- History is append-only; individual entries can be deleted but not edited

