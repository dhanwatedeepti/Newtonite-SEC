# Newtonite Operations Management Platform — "Operations Under Pressure"

A production-grade, full-stack operations management system built for the **Newtonite Software Engineering Challenge**.

This central web platform replaces disparate chats, emails, and spreadsheets by enabling cross-functional teams to create, assign, prioritize, track, and resolve operational work items with atomic concurrency control, strict resource authorization, and tamper-evident audit history.

---

## 1. Technology Stack

- **Frontend:**
  - React 18 with TypeScript
  - Vite for development and fast production bundling
  - Tailwind CSS for sleek, accessible UI styling
  - TanStack Query (React Query) for server state caching, polling, and invalidation
  - React Hook Form + Zod for client-side schema validation
  - Lucide React for consistent icons
- **Backend:**
  - Python 3.12+ with FastAPI
  - SQLAlchemy 2.x for type-safe ORM queries and database transactions
  - Alembic for database migrations
  - Argon2 (`argon2-cffi`) for cryptographically secure password hashing
  - Pydantic v2 for request/response contract validation
- **Database:**
  - PostgreSQL 16 (via Docker Compose)
  - SQLite dialect compatibility for quick local development without Docker
- **Testing:**
  - Pytest + HTTPX + pytest-asyncio for backend integration and correctness testing
  - Vitest + React Testing Library for frontend component and conflict handling testing

---

## 2. Core Correctness Behaviours

1. **Resource-Level Authorization:**
   - Evaluates multi-team memberships and user roles on every request.
   - Members can only view/create tasks within their joined teams, and can only edit tasks they created or are assigned to.
   - Members cannot reassign tasks; only Team Leads and Administrators possess reassignment privileges.
   - Probing unauthorized tasks returns a safe `404 Not Found` or `403 Forbidden`.
2. **Concurrent Update Detection (Optimistic Concurrency Control):**
   - Every work item tracks an integer `version` column.
   - Updates execute atomic version-checked SQL statements (`WHERE id = :id AND version = :expected_version`).
   - Conflicting concurrent edits return `409 Conflict` with current server version details, and **do not write phantom audit events**.
   - The frontend prompts the user to reload the latest version without silent data overwrite.
3. **Server-Side Workflow Finite State Machine:**
   - Centralized in `WorkflowService`. Allowed transitions: `open` → `in_progress` → `blocked` | `resolved` → `closed`.
   - Direct illegal transitions (e.g. `open` → `closed`) are rejected with `400 Bad Request`.
   - `closed` tasks are terminal for regular users; only Administrators can reopen closed tasks.
4. **Idempotency & Duplicate Submission Protection:**
   - `POST /api/v1/tasks` supports the `Idempotency-Key` header to safely handle network retries without creating duplicate tasks or audit records.

---

## 3. Demo Accounts & Credentials

All demo accounts share the password: **`Password123!`**

| Email | Full Name | Global Role | Team Roles |
|---|---|---|---|
| `admin@newtonite.com` | Sarah Administrator | Administrator (`admin`) | Global oversight across all teams |
| `lead.ops@newtonite.com` | David Chen | User (`user`) | Team Lead in **Operations**, Member in **Compliance** |
| `lead.eng@newtonite.com` | Elena Rostova | User (`user`) | Team Lead in **Engineering** |
| `member.ops@newtonite.com` | Marcus Vance | User (`user`) | Member in **Operations**, Member in **Customer Support** |
| `member.eng@newtonite.com` | Priya Sharma | User (`user`) | Member in **Engineering** |
| `member.multi@newtonite.com` | Alex Rivera | User (`user`) | Member in **Operations** & **Engineering** |

> **Pro Tip:** The login screen includes a **One-Click Demo Account Switcher** allowing instant switching between any role during evaluation.

---

## 4. Setup & Running Instructions

### Prerequisites
- Python 3.12 or compatible stable Python version
- Node.js v18+ and npm v9+
- Docker & Docker Compose (optional for PostgreSQL; local SQLite works out of the box)

---

### Step A: Database Configuration (PostgreSQL or Local Fallback)

#### Option 1: Run PostgreSQL via Docker Compose
```bash
docker compose up -d
```
This spins up PostgreSQL 16 on port `5432` with credentials defined in `docker-compose.yml`.

#### Option 2: Local SQLite Fallback (No Docker Required)
If running without Docker, the backend defaults to `sqlite:///./newtonite.db` in `backend/.env`.

---

### Step B: Backend Setup & Seed Data

#### Windows PowerShell:
```powershell
# Navigate to backend
cd backend

# Create virtual environment if not already present
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial teams, demo users, tasks, and audit logs
python -m app.seed

# Start backend server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Linux / macOS:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python3 -m app.seed
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The interactive FastAPI OpenAPI documentation is available at:
**[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

---

### Step C: Frontend Setup

Open a second terminal window:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```

Open your browser at: **[http://localhost:5173](http://localhost:5173)**

The Vite dev server automatically proxies all `/api/v1` calls to `http://127.0.0.1:8000`.

---

## 5. Running the Test Suites

### Backend Tests (Pytest — 18 Automated Tests)
The backend test suite verifies resource-level authorization, optimistic concurrency control conflict detection, workflow enforcement, audit consistency, server-side search & pagination, and idempotency protection.

```powershell
# Windows PowerShell (inside backend/)
.\venv\Scripts\pytest.exe -v

# Linux / macOS (inside backend/)
pytest -v
```

### Frontend Tests (Vitest + React Testing Library — 7 Automated Tests)
The frontend test suite verifies badge rendering, activity history diff parsing, and the 409 Conflict dialog reload flow.

```bash
# Inside frontend/
npm run test
```

### Production Build Verification
```bash
# Inside frontend/
npm run build
```

---

## 6. API Reference Overview

Base URL: `/api/v1`

- **Authentication:**
  - `POST /api/v1/auth/login`: Authenticates credentials with Argon2, issues HttpOnly session cookie and in-memory CSRF token.
  - `POST /api/v1/auth/logout`: Clears session cookie.
  - `GET /api/v1/auth/me`: Returns current user and active team memberships.
- **Work Items:**
  - `GET /api/v1/tasks`: Server-side filtered, searched, scoped, and paginated task list.
  - `POST /api/v1/tasks`: Create work item with optional `Idempotency-Key` header.
  - `GET /api/v1/tasks/{task_id}`: Retrieve task details with creator and assignee data.
  - `PATCH /api/v1/tasks/{task_id}`: Update task with OCC version check and workflow rules.
  - `GET /api/v1/tasks/{task_id}/activity`: Retrieve chronological audit events with field diffs.
- **Teams & Users:**
  - `GET /api/v1/teams`: List accessible teams.
  - `POST /api/v1/teams`: Administrator team creation.
  - `POST /api/v1/teams/{team_id}/members`: Administrator membership assignment.
  - `GET /api/v1/users`: List users scoped to user's teams (or all for admin).
- **Dashboard:**
  - `GET /api/v1/dashboard/metrics`: Live calculated metrics (active, open, in-progress, blocked, urgent, overdue).

---

## 7. Known Limitations

1. **Real Email Notifications:** Email notifications upon task assignment or priority change are intentionally not delivered to external SMTP relays. All activity is persisted to the audit trail instead.
2. **WebSocket Real-Time Subscriptions:** Task updates and metrics refresh using periodic query invalidation and polling (`30s`) rather than WebSockets.
3. **Custom Per-Team Dynamic Workflows:** The state machine currently follows a standardized operational transition model rather than arbitrary user-defined workflow graphs.
