import pytest
from app.models.audit import AuditEvent


def test_allowed_workflow_transitions(client, auth_helpers):
    admin = auth_helpers.create_user("admin.wf@newtonite.com", "Admin WF", role="admin")
    team = auth_helpers.create_team("WF Team")
    headers = auth_helpers.get_auth_headers(admin)

    # 1. Create task (initial status: open, version: 1)
    create_res = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={"title": "Workflow Test Task", "type": "operational_task", "team_id": team.id}
    )
    assert create_res.status_code == 201
    task_id = create_res.json()["id"]

    # 2. open -> in_progress (allowed)
    r1 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 1, "status": "in_progress"})
    assert r1.status_code == 200
    assert r1.json()["status"] == "in_progress"

    # 3. in_progress -> blocked (allowed)
    r2 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 2, "status": "blocked"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "blocked"

    # 4. blocked -> in_progress (allowed)
    r3 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 3, "status": "in_progress"})
    assert r3.status_code == 200
    assert r3.json()["status"] == "in_progress"

    # 5. in_progress -> resolved (allowed)
    r4 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 4, "status": "resolved"})
    assert r4.status_code == 200
    assert r4.json()["status"] == "resolved"

    # 6. resolved -> in_progress (reopen allowed)
    r5 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 5, "status": "in_progress"})
    assert r5.status_code == 200
    assert r5.json()["status"] == "in_progress"

    # 7. in_progress -> resolved -> closed
    r6 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 6, "status": "resolved"})
    assert r6.status_code == 200
    r7 = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"version": 7, "status": "closed"})
    assert r7.status_code == 200
    assert r7.json()["status"] == "closed"


def test_forbidden_transitions_rejected_without_modifying_task_or_audit(client, auth_helpers, db_session):
    admin = auth_helpers.create_user("admin.forbid@newtonite.com", "Admin Forbid", role="admin")
    team = auth_helpers.create_team("Forbid Team")
    headers = auth_helpers.get_auth_headers(admin)

    # Create task (status: open)
    create_res = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={"title": "Forbid Task", "type": "operational_task", "team_id": team.id}
    )
    task_id = create_res.json()["id"]
    initial_audit_count = db_session.query(AuditEvent).filter(AuditEvent.task_id == task_id).count()

    # Attempt forbidden transition: open -> closed
    res_open_closed = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=headers,
        json={"version": 1, "status": "closed"}
    )
    assert res_open_closed.status_code == 400
    assert res_open_closed.json()["error"] == "InvalidStatusTransition"

    # Attempt forbidden transition: open -> blocked
    res_open_blocked = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=headers,
        json={"version": 1, "status": "blocked"}
    )
    assert res_open_blocked.status_code == 400
    assert res_open_blocked.json()["error"] == "InvalidStatusTransition"

    # Verify task was NOT modified
    task = client.get(f"/api/v1/tasks/{task_id}", headers=headers).json()
    assert task["status"] == "open"
    assert task["version"] == 1

    # Verify NO misleading audit event was created
    current_audit_count = db_session.query(AuditEvent).filter(AuditEvent.task_id == task_id).count()
    assert current_audit_count == initial_audit_count


def test_closed_task_reopening_permissions(client, auth_helpers):
    admin = auth_helpers.create_user("admin.reopen@newtonite.com", "Admin Reopen", role="admin")
    member = auth_helpers.create_user("member.reopen@newtonite.com", "Member Reopen", role="user")
    team = auth_helpers.create_team("Reopen Team")

    auth_helpers.add_membership(member, team, role="member")

    admin_headers = auth_helpers.get_auth_headers(admin)
    member_headers = auth_helpers.get_auth_headers(member)

    # Create and advance task to closed with member as assignee
    t = client.post(
        "/api/v1/tasks",
        headers=admin_headers,
        json={"title": "Close Me", "type": "operational_task", "team_id": team.id, "assignee_id": member.id}
    ).json()
    task_id = t["id"]
    client.patch(f"/api/v1/tasks/{task_id}", headers=admin_headers, json={"version": 1, "status": "in_progress"})
    client.patch(f"/api/v1/tasks/{task_id}", headers=admin_headers, json={"version": 2, "status": "resolved"})
    client.patch(f"/api/v1/tasks/{task_id}", headers=admin_headers, json={"version": 3, "status": "closed"})

    # Ordinary member attempts to reopen closed task -> Rejected 400
    member_reopen_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=member_headers,
        json={"version": 4, "status": "in_progress"}
    )
    assert member_reopen_res.status_code == 400
    assert "Closed tasks are terminal and can only be reopened by an Administrator" in member_reopen_res.json()["message"]

    # Administrator reopens closed task -> Succeeds
    admin_reopen_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=admin_headers,
        json={"version": 4, "status": "in_progress"}
    )
    assert admin_reopen_res.status_code == 200
    assert admin_reopen_res.json()["status"] == "in_progress"
    assert admin_reopen_res.json()["version"] == 5
