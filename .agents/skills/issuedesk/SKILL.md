---
name: IssueDesk Project
description: Comprehensive skill for working on the IssueDesk bug tracker — covers architecture, coding conventions, backend/frontend patterns, testing, and common pitfalls.
---

# IssueDesk — Project Skill

IssueDesk (a.k.a. IssueHub) is a lightweight, full-stack bug tracker where teams create projects, file issues, comment on them, and track status. It uses a **FastAPI** backend with **PostgreSQL** and a **React (Vite)** frontend.

---

## Repository Layout

```
Issuedesk/
├── backend/                   # FastAPI Python backend
│   ├── main.py                # App entry point, CORS, error handlers
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # DATABASE_URL, SECRET_KEY, etc.
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── router.py      # Aggregates all endpoint routers under /api/v1
│   │   │   └── endpoints/     # Route handlers per entity
│   │   │       ├── auth.py    # POST /register, /login, GET /health
│   │   │       ├── users.py   # GET /users/me, PATCH /users/me
│   │   │       ├── projects.py# CRUD + member management
│   │   │       ├── issues.py  # CRUD + status workflow + filtering
│   │   │       └── comments.py# CRUD per issue
│   │   ├── core/
│   │   │   ├── config.py      # Pydantic BaseSettings (reads .env)
│   │   │   ├── database.py    # SQLAlchemy engine, SessionLocal, Base
│   │   │   ├── dependencies.py# get_current_user dependency
│   │   │   └── security.py    # bcrypt hashing, JWT create/decode
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── base.py        # TimestampMixin (id, created_at, updated_at)
│   │   │   ├── enums.py       # IssueStatus, IssuePriority, IssueType
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── project_member.py
│   │   │   ├── issue.py
│   │   │   └── comment.py
│   │   ├── schemas/           # Pydantic request/response models
│   │   │   ├── common.py      # MessageResponse, PaginatedResponse
│   │   │   ├── user.py        # UserCreate, UserLogin, UserResponse, TokenResponse
│   │   │   ├── project.py     # ProjectCreate, AddMemberRequest, ProjectDetailResponse
│   │   │   ├── issue.py       # IssueCreate, IssueUpdate, IssueResponse
│   │   │   └── comment.py     # CommentCreate, CommentResponse
│   │   ├── repositories/      # Data access layer (Repository pattern)
│   │   │   ├── base.py        # Generic CRUD BaseRepository[Model, Create, Update]
│   │   │   ├── user_repository.py
│   │   │   ├── project_repository.py
│   │   │   ├── issue_repository.py
│   │   │   └── comment_repository.py
│   │   └── services/
│   │       └── auth_service.py # Registration + login business logic
│   └── tests/
│       ├── conftest.py        # In-memory SQLite fixtures
│       ├── test_auth.py
│       ├── test_projects.py
│       └── test_issues.py
│
├── frontend/                  # React + Vite frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── src/
│       ├── main.jsx           # React DOM root
│       ├── App.jsx            # BrowserRouter + routes (ProtectedRoute / PublicRoute)
│       ├── index.css
│       ├── api/               # Axios service modules
│       │   ├── client.js      # Axios instance (baseURL, auth interceptor, 401 redirect)
│       │   ├── auth.js        # register, login, getProfile
│       │   ├── projects.js    # CRUD + addMember, removeMember
│       │   ├── issues.js      # CRUD (getAll, getById, create, update, delete)
│       │   ├── comments.js    # create, getByIssue, delete
│       │   └── users.js
│       ├── contexts/
│       │   ├── AuthContext.jsx # AuthProvider (user state, login, register, logout)
│       │   └── useAuth.js     # useAuth() hook
│       ├── components/
│       │   └── Layout.jsx     # Navbar + main content wrapper
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── ProjectsListPage.jsx
│       │   ├── CreateProjectPage.jsx
│       │   ├── ProjectDetailPage.jsx  # Member management UI
│       │   ├── IssuesListPage.jsx
│       │   ├── CreateIssuePage.jsx
│       │   └── IssueDetailPage.jsx    # Status workflow, priority/type selects, comments
│       └── utils/
│           └── errors.js      # extractErrorMessage() — parses FastAPI 422 errors
│
├── README.md
├── .gitignore
└── venv/                      # Python virtual environment (not committed)
```

---

## Architecture Patterns

### Backend

1. **Layered Architecture**: Endpoint → (Service) → Repository → Database.
   - **Endpoints** (`app/api/v1/endpoints/`) handle HTTP, validation, auth.
   - **Services** (`app/services/`) contain business logic (currently only `auth_service.py`; most CRUD goes directly through repositories).
   - **Repositories** (`app/repositories/`) encapsulate all SQLAlchemy queries. A generic `BaseRepository` provides CRUD; entity repositories extend it.

2. **Dependency Injection**: FastAPI `Depends()` for `get_db` (session) and `get_current_user` (JWT auth).

3. **Schema Separation**: Pydantic schemas in `app/schemas/` are separate from SQLAlchemy models in `app/models/`. Always use `model_config = {"from_attributes": True}` for ORM compatibility.

4. **Error Handling**: A global `RequestValidationError` handler in `main.py` returns 422 errors as `{"detail": [...]}` arrays. Individual endpoints raise `HTTPException` for domain errors.

5. **Status Workflow** (issues): `open → in_progress → resolved → closed`, with `reopened` branching. Transitions are validated in `IssueRepository.validate_transition()`.

### Frontend

1. **API Layer**: All API calls go through `src/api/client.js` (Axios instance with base URL `http://localhost:8000/api/v1`). Auth token is injected via a request interceptor. A 401 response interceptor clears storage and redirects to `/login`.

2. **Auth Context**: `AuthProvider` in `AuthContext.jsx` manages user state with `localStorage`. The `useAuth()` hook exposes `{ user, login, register, logout, loading }`.

3. **Routing**: `App.jsx` uses `ProtectedRoute` and `PublicRoute` wrapper components. Protected routes redirect to `/login` when unauthenticated; public routes redirect to `/` when already logged in.

4. **Success/Error Feedback**: Uses React Router location state (`navigate(path, { state: { successMessage: '...' } })`) for flash messages across navigations. Inline `success` and `error` state variables display green/red banners on action pages.

5. **Error Parsing**: `extractErrorMessage()` in `utils/errors.js` converts FastAPI 422 validation arrays into human-readable multi-line strings.

6. **User-Readable Enums**: `STATUS_LABELS` maps (e.g. `in_progress → "In Progress"`) are defined at the component level in pages that display issue status.

---

## Development Commands

### Backend
```bash
cd backend

# Run the server (dev mode with hot reload)
../venv/bin/python main.py
# or: uvicorn main:app --reload --port 8000

# Run tests
../venv/bin/python -m pytest
# or with PYTHONPATH: PYTHONPATH=. pytest

# API docs
# Swagger UI:  http://localhost:8000/docs
# ReDoc:       http://localhost:8000/redoc
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Dev server (usually http://localhost:5173 or 5174)
npm run dev

# Lint
npm run lint

# Production build
npm run build
```

---

## Database

- **Production**: PostgreSQL (`DATABASE_URL` in `backend/.env`)
- **Tests**: In-memory SQLite (configured in `tests/conftest.py` with `StaticPool`)
- **ORM**: SQLAlchemy 2.x with `declarative_base()`. No Alembic migrations yet — tables are created with `Base.metadata.create_all()` on app startup.
- **Models**: All models inherit `TimestampMixin` (provides `id`, `created_at`, `updated_at`) and `Base`.

### Entity Relationships
- **User** → owns Projects, reports Issues, is assigned Issues, writes Comments, has ProjectMemberships
- **Project** → has Issues, has ProjectMembers. Owner is a User FK.
- **ProjectMember** → join table (user_id, project_id, role). Unique constraint on `(user_id, project_id)`.
- **Issue** → belongs to Project, has reporter (User), optional assignee (User), has Comments
- **Comment** → belongs to Issue and User

---

## Key Conventions

### Backend
- **Project keys** must match `^[A-Z]+$` (uppercase letters only, 2-10 chars). The frontend auto-uppercases input.
- **Passwords** require 8+ chars with uppercase, lowercase, and a digit.
- **Member lookup** uses `get_by_username_or_email()` — users can be added to projects by either username or email.
- **JWT tokens** contain `sub` (user_id as string), `username`, `role`, `exp`, `iat`.
- **Pagination** uses `PaginatedResponse` schema (`items`, `total`, `page`, `page_size`, `total_pages`).

### Frontend
- **Styling**: TailwindCSS v4 (via `@tailwindcss/vite` plugin).
- **State management**: React Context for auth only; local component state for everything else.
- **Form validation errors**: Displayed in red `<div>` with class `bg-red-50 text-red-600 ... whitespace-pre-line`.
- **Success messages**: Displayed in green `<div>` with class `bg-green-50 text-green-700 border border-green-200`.
- **ESLint**: `react-hooks/set-state-in-effect` is disabled (setting state in useEffect for redirect flash messages is intentional).

---

## Common Pitfalls

1. **Running pytest**: Must use `../venv/bin/python -m pytest` from the `backend/` directory (not bare `pytest`) to ensure `app` module resolution works.

2. **CORS**: The backend allows origins on ports 3000, 5173, 5174, 5175, 8000. If the frontend starts on a different port, add it to `main.py`.

3. **SQLAlchemy lazy loading**: When importing models in standalone scripts, all related models must be imported (User, Project, Issue, Comment, ProjectMember) or SQLAlchemy will throw `InvalidRequestError` about unresolved relationship names.

4. **`.env` loading**: Pydantic Settings reads `.env` relative to CWD. Scripts must be run from `backend/` or the `DATABASE_URL` env var won't load.

5. **Email vs Username for members**: The `AddMemberRequest` schema accepts a plain `str` field called `email` (not `EmailStr`) because it supports both username and email lookups.

6. **Status display**: Never show raw enum values like `in_progress` in the UI. Always use the `STATUS_LABELS` map or similar formatting.

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Create user account |
| POST | `/api/v1/auth/login` | No | Get JWT access token |
| GET | `/api/v1/auth/health` | No | Health check |
| GET | `/api/v1/users/me` | Yes | Current user profile |
| PATCH | `/api/v1/users/me` | Yes | Update profile |
| GET | `/api/v1/projects` | Yes | List user's projects |
| POST | `/api/v1/projects` | Yes | Create project |
| GET | `/api/v1/projects/{id}` | Yes | Project details + members |
| PATCH | `/api/v1/projects/{id}` | Yes | Update project |
| DELETE | `/api/v1/projects/{id}` | Yes | Delete project |
| POST | `/api/v1/projects/{id}/members` | Yes | Add member |
| DELETE | `/api/v1/projects/{id}/members/{uid}` | Yes | Remove member |
| GET | `/api/v1/issues` | Yes | List issues (filtered, paginated) |
| POST | `/api/v1/issues` | Yes | Create issue |
| GET | `/api/v1/issues/{id}` | Yes | Issue details |
| PATCH | `/api/v1/issues/{id}` | Yes | Update issue fields |
| DELETE | `/api/v1/issues/{id}` | Yes | Delete issue |
| GET | `/api/v1/issues/{id}/comments` | Yes | List comments |
| POST | `/api/v1/issues/{id}/comments` | Yes | Add comment |
| DELETE | `/api/v1/issues/{id}/comments/{cid}` | Yes | Delete comment |

---

## Testing

- **Framework**: pytest with `FastAPI TestClient` (Starlette).
- **Database**: In-memory SQLite with `StaticPool` for test isolation.
- **Fixtures**: `conftest.py` provides `db_session` (function-scoped, creates/drops tables per test) and `client` (overrides `get_db` dependency).
- **Test files**: `test_auth.py` (5 tests), `test_issues.py` (2 tests), `test_projects.py` (3 tests).
- **Run**: `../venv/bin/python -m pytest` from the `backend/` directory.
