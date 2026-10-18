# Newtonite Operations Management — Complete Interview Guide & Code Walkthrough

This guide is designed to help you **confidently explain the system architecture**, **walk through the codebase**, and **ace live-coding modification requests** during your Newtonite technical interview.

---

## 1. The 60-Second Elevator Pitch

> *"The challenge addresses an expanding company struggling with uncoordinated operations managed through chat messages, emails, and spreadsheets—leading to lost work items, unclear ownership, duplicate work, and missing approvals.*
>
> *I designed and implemented a centralized, full-stack operations management platform using **FastAPI, SQLAlchemy 2.x, PostgreSQL, and React with TypeScript**. Rather than building a superficial UI prototype, I focused on three critical correctness guarantees that real operations systems require:*
>
> 1. ***Resource-Level Authorization:*** *Multi-team role-based permissions strictly enforced on the server, not just hidden buttons in the UI.*
> 2. ***Concurrent Update Detection:*** *Optimistic Concurrency Control using atomic version checking to prevent silent overwrite of concurrent edits, paired with non-disruptive conflict resolution in the UI.*
> 3. ***Server-Side Workflow Enforcement:*** *A centralized finite state machine that guarantees valid status transitions and protects terminal closed states.*
>
> *Everything is backed by atomic database transactions that guarantee audit trails are committed alongside task updates, plus idempotency protection for duplicate submissions."*

---

## 2. Request Lifecycle: How the System Works End-to-End

```
[ Browser / React App ]
         │
         │  1. HTTP Request (e.g. PATCH /api/v1/tasks/{id} with { version: 1, status: "in_progress" })
         │     Includes HttpOnly Session Cookie + X-CSRF-Token header
         ▼
[ FastAPI App (main.py) ]
         │
         │  2. CORS & Global Exception Handlers
         │
         ▼
[ Dependency Injection (deps.py) ]
         │
         │  3. Authenticate Session Token & check active user in DB
         │  4. Verify CSRF Token for state-changing requests
         │
         ▼
[ API Router (api/v1/tasks.py) ]
         │
         │  5. Validate request payload against Pydantic schema (TaskUpdate)
         │
         ▼
[ Task Service (services/task_service.py) ]
         │
         │  6. Permission Check: Can this user edit this task? (Admin vs Lead vs Member)
         │  7. Workflow Check: Is the status transition valid? (WorkflowService.validate_transition)
         │  8. Atomic OCC Update:
         │        UPDATE tasks SET ..., version = version + 1
         │        WHERE id = :id AND version = :expected_version
         │     (If rowcount == 0 ➔ Return 409 Conflict, rollback, NO audit event written)
         │  9. Create AuditEvent record detailing changes
         │  10. Commit both Task update + Audit event in ONE atomic transaction
         ▼
[ PostgreSQL / SQLite Database ]
         │
         │  11. Returns updated Task object with incremented version
         ▼
[ React Frontend / TanStack Query ]
         │
         │  12. Receives updated Task ➔ Updates UI cache ➔ Invalidates activity query
```

---

## 3. Key Files & Where Everything Lives

### Backend (`backend/app/`)
| File | Responsibility | What to look at |
|---|---|---|
| [`main.py`](file:///d:/Newtonite_SEC/backend/app/main.py) | Entrypoint | CORS configuration, standard exception handlers, router inclusion. |
| [`config.py`](file:///d:/Newtonite_SEC/backend/app/config.py) | Settings | Environment variables (`DATABASE_URL`, `SECRET_KEY`, cookie options). |
| [`database.py`](file:///d:/Newtonite_SEC/backend/app/database.py) | DB Engine | SQLAlchemy `engine`, `SessionLocal`, Base, `get_db` dependency. |
| [`models/task.py`](file:///d:/Newtonite_SEC/backend/app/models/task.py) | Task Model | Fields: `task_ref`, `version` (OCC), `team_id`, `created_by_id`, `assignee_id`. |
| [`models/audit.py`](file:///d:/Newtonite_SEC/backend/app/models/audit.py) | Audit Model | Stores `task_id`, `user_id`, `action`, JSON `details` (before/after changes). |
| [`models/user.py`](file:///d:/Newtonite_SEC/backend/app/models/user.py) | User & Membership | `User` (role: admin/user) and `TeamMembership` (role: team_lead/member). |
| [`services/task_service.py`](file:///d:/Newtonite_SEC/backend/app/services/task_service.py) | Business Logic | **THE CORE FILE:** Authorization logic, OCC version check, atomic audit commit. |
| [`services/workflow_service.py`](file:///d:/Newtonite_SEC/backend/app/services/workflow_service.py) | State Machine | Allowed status transitions (`open` ➔ `in_progress`, etc.) and admin reopen. |
| [`services/auth_service.py`](file:///d:/Newtonite_SEC/backend/app/services/auth_service.py) | Security | Argon2 password hashing, HMAC-signed session tokens, CSRF tokens. |
| [`api/deps.py`](file:///d:/Newtonite_SEC/backend/app/api/deps.py) | Auth Guards | `get_current_user`, `get_current_admin`, `verify_csrf`. |
| [`seed.py`](file:///d:/Newtonite_SEC/backend/app/seed.py) | Demo Seed | Populates demo teams, users with roles, and initial tasks. |

### Frontend (`frontend/src/`)
| File | Responsibility | What to look at |
|---|---|---|
| [`context/AuthContext.tsx`](file:///d:/Newtonite_SEC/frontend/src/context/AuthContext.tsx) | Auth State | Stores current user, logs in/out, hydrates session on app start. |
| [`api/client.ts`](file:///d:/Newtonite_SEC/frontend/src/api/client.ts) | Fetch Wrapper | Sends HttpOnly cookies (`credentials: 'include'`) & `X-CSRF-Token`. |
| [`pages/TaskListPage.tsx`](file:///d:/Newtonite_SEC/frontend/src/pages/TaskListPage.tsx) | Task Table | Server-side searching, status/priority/team filtering, pagination. |
| [`pages/TaskDetailPage.tsx`](file:///d:/Newtonite_SEC/frontend/src/pages/TaskDetailPage.tsx) | Task View | Permitted status transition buttons, conflict modal trigger, audit timeline. |
| [`pages/TaskCreateEditPage.tsx`](file:///d:/Newtonite_SEC/frontend/src/pages/TaskCreateEditPage.tsx) | Create/Edit Form | Idempotency key generation on create, OCC version tracking on edit. |
| [`components/ConflictDialog.tsx`](file:///d:/Newtonite_SEC/frontend/src/components/ConflictDialog.tsx) | OCC Modal | 409 Conflict popup with "Reload Latest Version" button. |
| [`components/ActivityTimeline.tsx`](file:///d:/Newtonite_SEC/frontend/src/components/ActivityTimeline.tsx) | Audit UI | Chronological audit stream displaying before/after diff cards. |

---

## 4. Deep-Dive on the 3 Mandatory Correctness Behaviours

### Behaviour 1: Resource-Level Authorization (Multi-Team RBAC)
- **The Concept:** A user is not just "admin" or "user"; they have team-specific responsibilities (`TeamMembership.role = "team_lead"` or `"member"`).
- **The Rules:**
  - `Admin`: Can do anything across all teams.
  - `Team Lead`: Can view/manage tasks for teams they lead; can assign/reassign to eligible members of that team; can change priority and status.
  - `Member`: Can view tasks in their teams. Can create tasks for their teams. Can **only edit** tasks they created (`created_by_id == user.id`) or are assigned to (`assignee_id == user.id`). Cannot reassign tasks.
- **The Code (`backend/app/services/task_service.py`):**
  ```python
  is_admin = user.global_role == "admin"
  is_team_lead = user_team_role == "team_lead"
  is_creator = current_task.created_by_id == user.id
  is_assignee = current_task.assignee_id == user.id

  if not (is_admin or is_team_lead or is_creator or is_assignee):
      raise HTTPException(
          status_code=403, 
          detail="Members can only update tasks they created or are assigned to."
      )

  # Only Team Lead or Admin can reassign:
  if update_in.assignee_id is not None and update_in.assignee_id != current_task.assignee_id:
      if not (is_admin or is_team_lead):
          raise HTTPException(status_code=403, detail="Only Team Leads or Administrators can reassign tasks.")
  ```

---

### Behaviour 2: Concurrent Update Detection (OCC)
- **The Concept:** Two users open the same task at 10:00 AM (Version 1). User A changes the title at 10:01 AM (becomes Version 2). User B submits a status change at 10:02 AM using stale data. Without OCC, User B would silently overwrite User A's title change!
- **The Mechanism:**
  1. The client must submit the expected version: `PATCH /tasks/{id}` with `{"version": 1, ...}`.
  2. The server executes an atomic conditional update:
     ```python
     stmt = (
         update(Task)
         .where(and_(Task.id == task_id, Task.version == expected_version))
         .values(**fields_to_update, version=Task.version + 1)
     )
     result = db.execute(stmt)
     ```
  3. If `result.rowcount == 0`, another process modified the task first.
  4. The server throws **HTTP 409 Conflict** with `{ "current_version": 2, "expected_version": 1 }`.
  5. **No audit event is written**, keeping the audit log clean.
  6. The frontend shows `<ConflictDialog>` prompting the user to reload the latest state.

---

### Behaviour 3: Server-Side Workflow Enforcement
- **The Concept:** Clients cannot directly set any status. Status transitions must follow an explicit state machine.
- **Allowed Transitions:**
  - `open` ➔ `in_progress`
  - `in_progress` ➔ `blocked` or `resolved`
  - `blocked` ➔ `in_progress`
  - `resolved` ➔ `closed` or `in_progress` (reopen)
  - `closed` ➔ Terminal for normal users. Only **Admin** can reopen.
- **The Code (`backend/app/services/workflow_service.py`):**
  ```python
  ALLOWED_STANDARD_TRANSITIONS = {
      "open": {"in_progress"},
      "in_progress": {"blocked", "resolved"},
      "blocked": {"in_progress"},
      "resolved": {"closed", "in_progress"},
      "closed": set(),  # Terminal for ordinary users
  }
  ```

---

## 5. Live-Coding Questions: What Interviewers Will Likely Ask You to Change

During technical interviews, evaluators will often say: *"Great, now can you modify the code to do X?"*
Here are the top 6 questions they can ask, where to go, and the exact code to write:

---

### Question 1: *"Can you add a new status, like 'on_hold' or 'under_review'?"*

#### Where to change:
1. `backend/app/schemas/task.py` (Add to allowed status list)
2. `backend/app/services/workflow_service.py` (Add transition rules)
3. `frontend/src/types/index.ts` & `TaskStatusBadge.tsx` (Add badge & UI styling)

#### Step-by-Step Code Change:
**In `backend/app/schemas/task.py`:**
```python
VALID_TASK_STATUSES = [
    "open",
    "in_progress",
    "blocked",
    "on_hold",      # <--- ADD THIS
    "resolved",
    "closed",
]
```

**In `backend/app/services/workflow_service.py`:**
```python
ALLOWED_STANDARD_TRANSITIONS = {
    "open": {"in_progress"},
    "in_progress": {"blocked", "resolved", "on_hold"},  # <--- Allow in_progress -> on_hold
    "on_hold": {"in_progress"},                        # <--- Allow on_hold -> in_progress
    "blocked": {"in_progress"},
    "resolved": {"closed", "in_progress"},
    "closed": set(),
}
```

---

### Question 2: *"Can you restrict task creation so only Team Leads or Admins can create Urgent tasks?"*

#### Where to change:
`backend/app/services/task_service.py` inside `create_task`.

#### Code Change:
```python
# In TaskService.create_task:
if task_in.priority == "urgent":
    user_team_role = team_roles.get(task_in.team_id)
    if user.global_role != "admin" and user_team_role != "team_lead":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Team Leads or Administrators can create Urgent priority work items."
        )
```

---

### Question 3: *"Can you add soft delete / task archival instead of permanent deletion?"*

#### Where to change:
1. `backend/app/models/task.py` (Add column `is_archived`)
2. `backend/app/services/task_service.py` (Filter `is_archived == False` in queries, add `archive_task` method)

#### Code Change:
**In `backend/app/models/task.py`:**
```python
is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
```
**In `backend/app/services/task_service.py` (inside `list_tasks`):**
```python
query = query.filter(Task.is_archived == False)
```
**Add Archive endpoint:**
```python
@staticmethod
def archive_task(db: Session, user: User, task_id: str):
    task = TaskService.get_task_by_id_or_404(db, task_id, user)
    if user.global_role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can archive tasks.")
    task.is_archived = True
    # Record in audit trail atomically
    audit = AuditEvent(task_id=task.id, user_id=user.id, action="task_archived", details="{}")
    db.add(audit)
    db.commit()
```

---

### Question 4: *"Can you add a new field, like 'estimated_hours' or 'tags'?"*

#### Where to change:
1. `backend/app/models/task.py`
2. `backend/app/schemas/task.py` (`TaskCreate`, `TaskUpdate`, `TaskResponse`)
3. `backend/app/services/task_service.py` (include in `fields_to_update`)
4. `frontend/src/types/index.ts` & form

#### Code Change:
**In `backend/app/models/task.py`:**
```python
estimated_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
```
**In `backend/app/schemas/task.py`:**
```python
class TaskCreate(BaseModel):
    # ...
    estimated_hours: Optional[float] = None

class TaskUpdate(BaseModel):
    # ...
    estimated_hours: Optional[float] = None
```
**In `backend/app/services/task_service.py` (`update_task`):**
```python
if update_in.estimated_hours is not None:
    changes["estimated_hours"] = {"from": current_task.estimated_hours, "to": update_in.estimated_hours}
    fields_to_update["estimated_hours"] = update_in.estimated_hours
```

---

### Question 5: *"How would you add task comments while keeping audit history consistent?"*

#### Answer to explain:
> *"I would create a `TaskComment` model with `id`, `task_id`, `user_id`, `content`, `created_at`. In `CommentService.create_comment`, I would insert both the `TaskComment` and an `AuditEvent(action='comment_added')` in the same database transaction. That way, the comment and its audit trail are committed atomically."*

---

### Question 6: *"Why did you use Optimistic Concurrency Control instead of Pessimistic Locking (SELECT FOR UPDATE)?"*

#### Answer to explain:
> *"Pessimistic locking holds a lock on the database row from the time a user opens the page until they click Save. If a user walks away for coffee, the entire row remains locked, blocking all other employees. Furthermore, holding open DB transactions across web requests causes connection pool exhaustion and deadlocks.*
>
> *Optimistic Concurrency Control with an atomic version column (`WHERE id = :id AND version = :expected_version`) allows high read concurrency. If a rare collision occurs, the database safely rejects the stale update with 409 Conflict, and the frontend prompts the user to reload the latest data without silent data loss."*

---

## 6. How to Run & Demo Live in the Interview

### Terminal 1: Backend
```powershell
cd d:\Newtonite_SEC\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- Open Swagger Docs: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

### Terminal 2: Frontend
```powershell
cd d:\Newtonite_SEC\frontend
npm run dev
```
- Open App: **[http://localhost:5173](http://localhost:5173)**

### Terminal 3: Run Tests to Prove Correctness
```powershell
# Run backend tests (18 tests)
cd d:\Newtonite_SEC\backend
.\venv\Scripts\pytest.exe -v

# Run frontend tests (7 tests)
cd d:\Newtonite_SEC\frontend
npm run test
```

### Demo Script to Walk Interviewers Through:
1. **Show Login:** Use the **One-Click Demo Switcher** at the bottom of the login page to show different roles (Admin vs Team Lead vs Member).
2. **Show Dashboard:** Point out that metrics (urgent, overdue, active) are calculated live from PostgreSQL/SQLite, not hardcoded.
3. **Show Concurrency Detection (409 Conflict):**
   - Open Task `OPS-1001` in two separate browser tabs.
   - In Tab 1, change priority from `urgent` to `high` and save.
   - In Tab 2, attempt to change the title.
   - **Show the Conflict Dialog pop up!** Explain how the version column prevented tab 2 from overwriting tab 1.
4. **Show Workflow Rules:**
   - On an `Open` task, show that only `Start Progress` is available.
   - Try invalid transitions or show `Closed` tasks can only be reopened by Admin.
5. **Show Activity Timeline:**
   - Scroll down on the task detail page to show chronological cards with before/after diffs.
