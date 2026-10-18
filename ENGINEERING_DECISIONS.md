# Engineering Decisions — Newtonite Operations Management System

This document outlines five foundational architectural decisions made during the design and implementation of the **Newtonite Operations Management Platform** for the "Operations Under Pressure" challenge. Each decision reflects deliberate trade-offs suited to a growing company managing complex operational workflows.

---

## Decision 1: Relational Database Model with a Modular Monolith Architecture

### Context & Choice
The company’s previous reliance on ad-hoc spreadsheets, chat messages, and informal emails led to untracked tasks, unclear ownership, and missed approvals. The operational workload demands relational consistency across users, teams, multi-team memberships, task lifecycles, and chronological audit trails.

We chose **PostgreSQL** paired with **SQLAlchemy 2.x** and **FastAPI**, structured as a clean **modular monolith** rather than distributed microservices:
- Relational integrity is enforced using foreign keys (`ON DELETE CASCADE` / `RESTRICT` / `SET NULL`), unique constraints (e.g. `(user_id, team_id)`, task references), and indexed lookup columns.
- The backend application is organized into distinct domain layers: `models/`, `schemas/`, `services/`, and `api/v1/`.

### Trade-offs & Limitations
- **Benefits:** Eliminates network latency between microservices, simplifies ACID transactions across tasks and audit logs, provides type-safe ORM queries, and allows local execution via standard Docker Compose without orchestrator overhead.
- **Limitations:** While PostgreSQL scales efficiently to millions of records, horizontal sharding across distinct teams would require future database partitioning if transaction volume reaches tens of thousands of concurrent writes per second. For the one-day scope and the company's growth trajectory, a properly indexed single relational database provides the highest reliability and lowest operational complexity.

---

## Decision 2: Server-Side Resource-Level Authorization via Team Memberships

### Context & Choice
Work items in a growing organization belong to specific functional teams (e.g., Operations, Engineering, Support, Compliance). A user may belong to multiple teams with different responsibilities (e.g., Team Lead in Operations, Member in Compliance). 

We implemented **server-side resource-level authorization** within `TaskService`:
- **Administrators (`admin`)** possess global operational authority to view, assign, update, and reopen any task.
- **Team Leads (`team_lead`)** can manage tasks within their led teams, assign work to eligible team members, adjust priorities, and advance workflow statuses.
- **Members (`member`)** can view tasks within their joined teams and create tasks for those teams, but can only edit tasks they either created or are directly assigned to. Members cannot reassign tasks or alter team boundaries.
- Access denial returns `403 Forbidden` for unauthorized actions, or `404 Not Found` when probing tasks outside the user's teams to prevent disclosing the existence of internal or restricted items.

### Trade-offs & Limitations
- **Benefits:** Security is enforced strictly on the server for every endpoint (`POST`, `PATCH`, `GET`), preventing malicious users or modified client states from tampering with unauthorized tasks.
- **Limitations:** Determining permissions requires loading user team memberships on state-changing requests. We optimized this using SQLAlchemy `joinedload` on authentication to minimize query overhead, avoiding N+1 database queries.

---

## Decision 3: Optimistic Concurrency Control (OCC) via Atomic Version Checking

### Context & Choice
When multiple employees collaborate under pressure, concurrent edits can result in the "lost update" problem, where user B silently overwrites modifications submitted moments earlier by user A.

We implemented **Optimistic Concurrency Control (OCC)** using an integer `version` column:
1. Every task response exposes its current `version` integer (starting at 1).
2. Any client updating a task must supply the expected `version` in the request payload.
3. The server executes an atomic database update statement:
   ```sql
   UPDATE tasks 
   SET title = :title, status = :status, ..., version = version + 1, updated_at = :now
   WHERE id = :id AND version = :expected_version;
   ```
4. If `rowcount == 0`, a concurrent modification occurred or the client's view is stale. The server aborts the transaction, returns **HTTP 409 Conflict**, provides structured error details (including current server version and client version), and **crucially refrains from writing a phantom audit event**.
5. The frontend intercepts 409 Conflict responses and presents a dedicated `ConflictDialog` prompting the user to reload the latest state rather than silently overwriting.

### Trade-offs & Limitations
- **Benefits:** Completely eliminates silent data loss without pessimistic database row-locking (`SELECT FOR UPDATE`), which can cause thread starvation and deadlock under high read concurrency.
- **Limitations:** In extremely high-contention scenarios (multiple users editing the same field within the same second), users receive a 409 and must re-enter changes. For operations management, this guarantees data integrity while preserving responsiveness.

---

## Decision 4: Centralized Server-Side Workflow Finite State Machine

### Context & Choice
Allowing clients to directly assign any task status risks invalid states (such as immediately closing an unverified incident or jumping from Open directly to Closed). Furthermore, closed tasks represent finalized work that should not be casually altered by regular staff.

We centralized workflow state transitions into `WorkflowService`:
- **Allowed standard transitions:**
  - `open` → `in_progress`
  - `in_progress` → `blocked` | `resolved`
  - `blocked` → `in_progress`
  - `resolved` → `closed` | `in_progress` (reopening before closure)
- **Terminal closure:** `closed` tasks are strictly terminal for ordinary users. Only an Administrator can reopen a closed task (`closed` → `in_progress` or `open`).
- Any illegal transition is rejected with **HTTP 400 Bad Request** with structured diagnostic fields (`current_status`, `target_status`, `allowed_statuses`).
- Invalid transitions are rejected before altering the database, guaranteeing no invalid records or misleading audit entries are created.

### Trade-offs & Limitations
- **Benefits:** Business rules are unified in a single maintainable service rather than scattered across endpoint handlers. The frontend consumes this logic to dynamically present valid action buttons while the server guarantees invariant compliance.
- **Limitations:** Custom per-team workflows (e.g. specialized approval chains for Compliance) are not yet configurable dynamically at runtime. For the core platform, a unified finite state machine provides consistency across all operational domains.

---

## Decision 5: Atomic Transactional Audit Trails and Duplicate-Submission Protection

### Context & Choice
Operations under pressure require an unquestionable, tamper-evident history of who changed what, when, and why. At the same time, network flakiness or repeated button clicks during incidents can cause duplicate task submissions.

We implemented:
1. **Atomic Audit Logging:**
   - The task update and its corresponding `AuditEvent` are committed in the **exact same database transaction**.
   - If the task update fails (due to OCC conflict, validation error, or DB fault), the transaction rolls back and no audit event is saved.
   - Audit records store before-and-after values for altered fields (`details.changes`), enabling a rich chronological timeline.
2. **Idempotency Protection:**
   - Task creation supports the `Idempotency-Key` HTTP header.
   - When present, the server records the key and cached response. Repeated submissions return the original response code and payload without generating duplicate tasks or duplicate audit events.

### Intentionally Deferred Features
To deliver a robust, fully tested platform within the one-day assessment, the following were intentionally deferred:
- **Redis / Celery asynchronous queues:** Background email notifications and distributed cache layers were deferred because in-process database transactions and indexed queries deliver sub-50ms latency for operational workloads.
- **WebSocket real-time subscriptions:** Polling with TanStack Query (`refetchInterval: 30000`) was chosen instead of WebSocket infrastructure to keep deployment lightweight and resilient against network disconnects.
- **Dynamic workflow designer:** A hardcoded, robust state machine was preferred over a complex graph-based workflow engine that would introduce configuration errors during pressure scenarios.
