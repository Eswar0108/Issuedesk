# IssueHub — A Lightweight Bug Tracker

IssueHub is a minimal, production-grade bug tracker designed for teams to organize projects, file issues, comment on them, and track their workflows. It is built with a decoupled FastAPI (Python) backend and a modern React (Vite) frontend.

---

## 🛠️ Tech Stack & Trade-offs

### Backend (FastAPI + SQLAlchemy)
- **FastAPI**: Chosen for its high performance, automatic Swagger/OpenAPI documentation generation, and type validation using Pydantic.
- **SQLAlchemy (ORM)**: Provides robust mapping of python objects to relational tables. Kept model structures modular.
- **PostgreSQL**: Used as the primary relational database to handle complex joining logic securely (SQLite in-memory is used for the test suite to keep tests isolated and fast).
- **Password Hashing**: `passlib` with `bcrypt` to secure user credentials.
- **Session / Security**: JWT Bearer token authentication stored locally and sent via headers.

### Frontend (React + Vite)
- **React (Vite)**: Quick hot-reloading dev server with minimal build output.
- **Axios**: Standard HTTP request client configured with request interceptors to inject auth headers automatically.
- **CSS (Tailwind style)**: Fully responsive layouts with premium micro-interactions.

---

## ⚙️ Project Setup

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   *Modify the `DATABASE_URL` in `.env` to point to your PostgreSQL instance:*
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
   ```

### Database Migrations (Alembic)

This project uses Alembic for database schema management instead of `Base.metadata.create_all()`.

After setting up your database, run the initial migration:

```bash
cd backend
PYTHONPATH=. alembic upgrade head
```

To generate a new migration after modifying models:

```bash
PYTHONPATH=. alembic revision --autogenerate -m "description_of_change"
PYTHONPATH=. alembic upgrade head
```

To rollback the last migration:

```bash
PYTHONPATH=. alembic downgrade -1
```

> **Note**: The test suite uses an in-memory SQLite database and creates/drops tables automatically, so it does not require Alembic.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```

---

## 🚀 Running the Application

### 1. Start the Backend Server
From the `backend` directory with the virtual environment activated:
```bash
python main.py
# Or: uvicorn main:app --reload --port 8000
```
- API Docs will be available at: http://localhost:8000/docs
- ReDoc at: http://localhost:8000/redoc

### 2. Start the Frontend Server
From the `frontend` directory:
```bash
npm run dev
```
Open http://localhost:5173 (or the port Vite prints in your console) to access the app.

---

## 🧪 Running Tests

A comprehensive pytest suite covering authentication, projects list, email-based user invitations, issues, and comments is configured to run on an in-memory SQLite database for speed and isolation.

From the `backend` directory with your virtual environment activated:
```bash
PYTHONPATH=. pytest
```

---

## 🔒 Security & Input Validation
- **Authentication**: JWT token validation protects all API routes.
- **Data Validation**: Inputs are strictly validated on both the Pydantic/FastAPI level and the frontend forms.
- **Clean Validation Errors**: FastAPI validation errors (422) are intercepted by the frontend and formatted into clear, human-readable instructions instead of showing raw regex parameters.
- **Redundant database constraints handled**: Made sure that the owner/reporter relationships are checked on the DB level.
