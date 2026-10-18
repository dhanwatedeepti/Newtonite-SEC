def test_task_update_and_audit_committed_together(client, auth_helpers):
    admin = auth_helpers.create_user("admin.audit@newtonite.com", "Admin Audit", role="admin")
    team = auth_helpers.create_team("Audit Team")
    headers = auth_helpers.get_auth_headers(admin)

    # Create task
    t = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={"title": "Audit Consistency Task", "type": "production_incident", "priority": "medium", "team_id": team.id}
    ).json()
    task_id = t["id"]

    # Activity should show created event
    act1 = client.get(f"/api/v1/tasks/{task_id}/activity", headers=headers).json()
    assert len(act1) == 1
    assert act1[0]["action"] == "task_created"
    assert act1[0]["details"]["priority"] == "medium"
    assert act1[0]["user"]["email"] == "admin.audit@newtonite.com"

    # Update priority to urgent
    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=headers,
        json={"version": 1, "priority": "urgent"}
    )
    assert patch_res.status_code == 200

    # Activity should now show priority change
    act2 = client.get(f"/api/v1/tasks/{task_id}/activity", headers=headers).json()
    assert len(act2) == 2
    priority_event = act2[0]  # newest first
    assert priority_event["action"] == "priority_changed"
    assert priority_event["details"]["changes"]["priority"]["from"] == "medium"
    assert priority_event["details"]["changes"]["priority"]["to"] == "urgent"
