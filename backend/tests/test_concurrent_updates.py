import pytest
from app.models.audit import AuditEvent


def test_concurrent_update_detection_and_conflict_handling(client, auth_helpers, db_session):
    admin = auth_helpers.create_user("admin.occ@newtonite.com", "Admin OCC", role="admin")
    team = auth_helpers.create_team("OCC Team")
    headers = auth_helpers.get_auth_headers(admin)

    # 1. Create a task (starts at version 1)
    create_res = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={"title": "Original Title", "type": "operational_task", "team_id": team.id}
    )
    assert create_res.status_code == 201
    task = create_res.json()
    task_id = task["id"]
    assert task["version"] == 1

    # Record initial audit events count
    initial_audit_count = db_session.query(AuditEvent).filter(AuditEvent.task_id == task_id).count()

    # 2. First update with version=1 succeeds and increments version to 2
    update1_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=headers,
        json={"version": 1, "title": "Updated Title by Client A"}
    )
    assert update1_res.status_code == 200
    assert update1_res.json()["title"] == "Updated Title by Client A"
    assert update1_res.json()["version"] == 2

    post_update1_audit_count = db_session.query(AuditEvent).filter(AuditEvent.task_id == task_id).count()
    assert post_update1_audit_count == initial_audit_count + 1

    # 3. Second update from Client B using stale version=1
    update2_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=headers,
        json={"version": 1, "title": "Stale Overwrite by Client B"}
    )
    assert update2_res.status_code == 409
    error_data = update2_res.json()
    assert error_data["error"] == "Conflict"
    assert error_data["current_version"] == 2
    assert error_data["expected_version"] == 1

    # 4. Verify newer data was NOT overwritten
    task_check = client.get(f"/api/v1/tasks/{task_id}", headers=headers)
    assert task_check.json()["title"] == "Updated Title by Client A"
    assert task_check.json()["version"] == 2

    # 5. Verify failed concurrent update did NOT write an audit event
    post_conflict_audit_count = db_session.query(AuditEvent).filter(AuditEvent.task_id == task_id).count()
    assert post_conflict_audit_count == post_update1_audit_count  # No additional audit event added!


def test_update_succeeds_with_fresh_version(client, auth_helpers):
    admin = auth_helpers.create_user("admin.occ2@newtonite.com", "Admin OCC 2", role="admin")
    team = auth_helpers.create_team("OCC Team 2")
    headers = auth_helpers.get_auth_headers(admin)

    create_res = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={"title": "Task 1", "type": "operational_task", "team_id": team.id}
    )
    task_id = create_res.json()["id"]

    # Sequential updates matching version
    res1 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 1, "title": "Title V2"})
    assert res1.status_code == 200
    assert res1.json()["version"] == 2

    res2 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 2, "title": "Title V3"})
    assert res2.status_code == 200
    assert res2.json()["version"] == 3
