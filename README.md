# PostmanClone 🚀

A full-featured Postman API client clone built with **Next.js + FastAPI**.  
Supports real HTTP requests, collections, environments with `{{variables}}`, history, code snippets, export/import, and more.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (TypeScript, App Router, Tailwind v4) |
| Backend | Python 3 + FastAPI |
| Database | SQLite via SQLAlchemy ORM |
| HTTP Client | aiohttp (async proxy runner — avoids CORS) |
| State Management | React Context + useReducer |

---

## Setup Instructions

### Prerequisites
- **Node.js 18+**
- **Python 3.10+**

---

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend starts at **http://localhost:8000**.  
On first run it automatically:
- Creates `postman_clone.db` (SQLite)
- Seeds sample collections, environments, and history

> You can view the interactive API docs at http://localhost:8000/docs

---

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:3000**.

> Make sure the backend is running before opening the frontend.

---

### Environment Variables (Frontend)

The frontend reads `NEXT_PUBLIC_API_URL` to know where the backend is.

**Local development** — this is already set to `http://localhost:8000` by default in `next.config.ts`, so no setup is needed.

**Production** — create a `frontend/.env.local` file:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

---

## Project Structure

```
postman-clone/
├── backend/
│   ├── main.py              # FastAPI app — all API routes
│   ├── models.py            # SQLAlchemy ORM database models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # SQLite engine + session dependency
│   ├── runner.py            # Core HTTP proxy executor (aiohttp)
│   ├── resolver.py          # {{variable}} substitution engine
│   ├── snippet_generator.py # Code snippet output (curl, fetch, etc.)
│   ├── seed.py              # Database seeder (runs once on startup)
│   └── requirements.txt
│
└── frontend/
    └── app/
        ├── page.tsx               # Root layout — wires everything together
        ├── layout.tsx             # Next.js root layout
        ├── globals.css            # Postman-matching dark theme CSS variables
        ├── types/index.ts         # All TypeScript type definitions
        ├── lib/
        │   ├── api.ts             # All backend API calls (axios)
        │   ├── store.tsx          # Global state (Context + useReducer)
        │   └── utils.ts           # Helpers: URL builder, formatters, etc.
        └── components/
            ├── TopBar.tsx         # Header: logo, workspace, env selector
            ├── TabBar.tsx         # Open request tabs bar
            ├── sidebar/
            │   └── Sidebar.tsx    # Collections tree + History list
            ├── request/
            │   ├── RequestBuilder.tsx  # URL bar, method, sub-tabs
            │   ├── KVEditor.tsx        # Reusable key-value table editor
            │   ├── BodyEditor.tsx      # Raw/form-data/urlencoded body
            │   └── AuthTab.tsx         # Bearer / Basic / API Key auth
            ├── response/
            │   └── ResponseViewer.tsx  # Pretty/Raw body, headers, info
            ├── modals/
            │   └── Modals.tsx          # All modals (collection, env, save, etc.)
            └── ui/
                └── index.tsx           # Shared UI components (Button, Badge, etc.)
```

---

## Database Schema

```
Workspaces
  id, name, description, created_at, updated_at
  └── Collections (workspace_id FK)
        id, workspace_id, name, description, created_at, updated_at
        ├── Folders (collection_id FK)           [optional nesting]
        │     id, collection_id, name, created_at
        │     └── Requests (folder_id FK)
        └── Requests (collection_id FK, folder_id nullable)
              id, collection_id, folder_id (nullable), name,
              method, url, description,
              body_type, body_content, body_language,
              auth_type, auth_data (JSON),
              created_at, updated_at
              ├── Headers (request_id FK)
              │     id, request_id, key, value, description, is_active
              └── QueryParams (request_id FK)
                    id, request_id, key, value, description, is_active

  └── Environments (workspace_id FK)
        id, workspace_id, name, created_at, updated_at
        └── Variables (environment_id FK)
              id, environment_id, key, value, is_secret, is_active

History (standalone audit log — every Send click)
  id, request_id (nullable FK — null for ad-hoc sends),
  method, url,
  headers_snapshot (JSON), params_snapshot (JSON),
  body_type, body_snapshot,
  environment_id (nullable FK), environment_name (snapshot),
  status_code, status_text,
  response_time_ms, response_size_bytes,
  response_headers (JSON), response_body,
  executed_at, is_error, error_message
```

**Key design decisions:**
- `request_id` in History is nullable — unsaved/ad-hoc sends are still logged
- `environment_name` is snapshotted so history remains readable even if the environment is later deleted
- `is_active` on headers, params, and variables lets users toggle without deleting
- `is_secret` on variables masks API keys in the UI
- `auth_data` stored as JSON — flexible for bearer / basic / api-key without extra tables
- Folders are optional — requests can live directly under a collection

---

## API Overview

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/workspaces` | List all workspaces |
| GET | `/workspaces/{id}/collections` | Collections with nested folders + requests |
| POST | `/collections` | Create collection |
| PATCH | `/collections/{id}` | Rename collection |
| DELETE | `/collections/{id}` | Delete collection (cascades) |
| POST | `/folders` | Create folder |
| PATCH/DELETE | `/folders/{id}` | Update/delete folder |
| POST | `/requests` | Save a request |
| PATCH | `/requests/{id}` | Update saved request |
| DELETE | `/requests/{id}` | Delete saved request |
| GET | `/workspaces/{id}/environments` | List environments with variables |
| POST | `/environments` | Create environment |
| PUT | `/environments/{id}/variables` | Replace all variables |
| DELETE | `/environments/{id}` | Delete environment |
| GET | `/history` | Recent history (paginated) |
| DELETE | `/history` | Clear all history |
| **POST** | **`/run`** | **Send real HTTP request (core feature)** |
| GET | `/collections/{id}/export` | Export as Postman Collection v2.1 JSON |
| POST | `/collections/import` | Import Postman Collection JSON |
| POST | `/snippet` | Generate code snippet (curl/fetch/python/nodejs) |
| GET | `/health` | Health check |

---

## Core Features

- ✅ **Real HTTP requests** — backend proxies requests via aiohttp (avoids CORS)
- ✅ **Collections** — full CRUD, nested folders, rename inline
- ✅ **Request Builder** — GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS, headers, params, body, auth
- ✅ **Body types** — raw (JSON/text/XML/HTML), form-data, x-www-form-urlencoded
- ✅ **Auth** — None, Bearer Token, Basic Auth, API Key (header or query)
- ✅ **Environments & Variables** — `{{variable}}` resolved at send time
- ✅ **History** — every request logged; re-open from sidebar
- ✅ **Response Viewer** — Pretty/Raw toggle, JSON highlighting, status, time, size, headers
- ✅ **Tabs** — multiple open requests; orange dot for unsaved
- ✅ **Resizable panes** — drag sidebar width and response panel height
- ✅ **Toasts** — success/error notifications
- ✅ **Keyboard shortcuts** — Ctrl+Enter to send, Ctrl+S to save

## Bonus Features (also implemented)

- ✅ **Code Snippet Generation** — cURL, Fetch, Python (requests), Node.js (axios)
- ✅ **Export Collection** — Postman Collection v2.1 JSON format
- ✅ **Import Collection** — import any Postman Collection v2/v2.1 JSON
- ✅ **Seeded sample data** — immediately usable with JSONPlaceholder + HTTPBin collections

---

## Deployment

### Backend (Render)
1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repository
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Frontend (Vercel)
1. Import your GitHub repository on [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
4. Deploy

---

## Assumptions

- Single default user (no real authentication — assumed logged in as per spec)
- SQLite used for simplicity; can be swapped for PostgreSQL via SQLAlchemy connection string change
- SSL verification disabled in runner (`ssl=False`) for development convenience
- History is append-only (no edit); only delete is supported
