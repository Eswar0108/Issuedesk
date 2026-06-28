# ⚡ IssueDesk — AI-Powered Issue Tracker & Workspace

**IssueDesk** is a production-grade, full-stack issue tracking system built for engineering teams to organize projects, triage tickets, manage workloads, and leverage an intelligent **RAG AI Assistant** directly on top of project data. It features a decoupled **FastAPI (Python)** backend and a glassmorphic **React (Vite + Tailwind CSS v4)** frontend.

---

## ✨ AI Features & Capabilities

IssueDesk features a flexible **Provider-Adapter LLM architecture** supporting multiple AI engines (**Groq**, **Google Gemini**, **OpenAI**, and offline local **Ollama**).

* 🔮 **RAG-Powered AI Assistant (`IssueDesk AI`)**: Conversational project assistant that analyzes all project tickets, status metrics, and team comment threads to answer natural language queries. Includes pre-computed statistical headers for accurate counting of priority bugs and task timelines.
* 🔍 **AI Semantic Search**: Vector-based semantic search across project issues using vector embeddings, with automatic text-matching fallback for non-embedding LLM providers.
* ✍️ **AI Auto-Enhance Ticket Descriptions**: Transforms draft bug reports into professionally structured Markdown descriptions complete with Summary, Steps to Reproduce, Expected vs Actual Behavior, and recommended Priority/Type tags.
* 🤖 **Smart Assignee Recommendations**: Analyzes new ticket content against team members' real-time active workloads and project roles to suggest the optimal developer assignment.

---

## 🛠️ Tech Stack & Architecture

### Backend (FastAPI + SQLAlchemy + Alembic)
* **FastAPI**: High-performance Python web framework providing automatic OpenAPI/Swagger documentation, asynchronous execution, and strict Pydantic v2 data validation.
* **SQLAlchemy (ORM) & PostgreSQL**: Production-grade relational mapping with Alembic schema migration tracking.
* **LLM Abstraction Layer**: Pluggable provider system (`BaseLLMProvider`) supporting `GroqProvider`, `GeminiProvider`, `OpenAIProvider`, and `OllamaProvider`.
* **Security & Auth**: OAuth2 password flow with JWT Bearer tokens and passlib bcrypt password hashing.

### Frontend (React + Vite + Tailwind CSS v4)
* **React 18 & Vite**: Fast developer hot-reloading with production build optimization.
* **Design System & Aesthetics**: Styled with Tailwind CSS v4, custom glassmorphism utilities (`.glass-card`), dynamic gradient meshes, and Google Fonts (`Outfit` for headings & `Inter` for body UI).
* **Axios HTTP Client**: Centralized API request routing with automated bearer token injection and standard error handling.

---

## ⚙️ Environment Variables & Configuration

Create a `.env` file in the `backend` directory based on `.env.example`:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/issuedesk

# Security & JWT
SECRET_KEY=your_super_secret_jwt_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI Provider Configuration
# Options: groq, gemini, openai, ollama
LLM_PROVIDER=groq
AI_NAME=IssueDesk AI

# Groq API Configuration (Recommended Free Production Tier)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Optional Alternative Providers
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# CORS Configuration (Comma-separated origins for deployment)
CORS_ORIGINS=https://issuedesk-six.vercel.app,http://localhost:5173
```

---

## 🚀 Getting Started Locally

### 1. Backend Setup (Python 3.10+)

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
PYTHONPATH=. alembic upgrade head

# Start the dev server
uvicorn main:app --reload --port 8008
```
* Interactive API Documentation: http://localhost:8008/docs
* ReDoc UI: http://localhost:8008/redoc

### 2. Frontend Setup (Node.js 18+)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
* Web Application UI: http://localhost:5173

---

## 🧪 Running Tests

The test suite covers authentication, project workspaces, issue lifecycles, and AI endpoints on an isolated in-memory SQLite database.

```bash
cd backend
PYTHONPATH=. pytest
```

---

## 🐳 Production Deployment

* **Backend (Docker & Railway)**: Containerized via [backend/Dockerfile](file:///Users/tejeswarreddy/Downloads/python/Issuedesk/backend/Dockerfile) with automated startup database migration (`alembic upgrade head`). Deployed on Railway connected to PostgreSQL.
* **Frontend (Vercel SPA)**: Configured with SPA rewrite rules in [frontend/vercel.json](file:///Users/tejeswarreddy/Downloads/python/Issuedesk/frontend/vercel.json) to route all paths cleanly to `index.html`.
