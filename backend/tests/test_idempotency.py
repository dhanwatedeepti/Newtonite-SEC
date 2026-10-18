from app.models.task import Task
from app.models.audit import AuditEvent


def test_duplicate_submission_protection_with_idempotency_key(client, auth_helpers, db_session):
    admin = auth_helpers.create_user("admin.idem@newtonite.com", "Admin Idem", role="admin")
    team = auth_helpers.create_team("Idem Team")
    headers = auth_helpers.get_auth_headers(admin)
    headers["Idempotency-Key"] = "unique-key-abc-123"

    payload = {
        "title": "Idempotent Task Request",
        "type": "operational_task",
        "priority": "high",
        "team_id": team.id
    }

    # 1. First submission
    res1 = client.post("/api/v1/tasks", headers=headers, json=payload)
    assert res1.status_code == 201
    task1 = res1.json()
    task1_id = task1["id"]

    # 2. Second submission with the same idempotency key (e.g. network retry)
    res2 = client.post("/api/v1/tasks", headers=headers, json=payload)
    assert res2.status_code == 201
    task2 = res2.json()
    assert task2["id"] == task1_id
    assert task2["title"] == task1["title"]

    # 3. Verify exactly 1 task exists in database for this title
    count = db_session.query(Task).filter(Task.title == "Idempotent Task Request").count()
    assert count == 1

    # 4. Verify only 1 audit event was created
    audit_count = db_session.query(AuditEvent).filter(AuditEvent.task_id == task1_id).count()
    assert audit_count == 1
