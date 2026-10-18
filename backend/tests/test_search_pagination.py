def test_task_search_filters_and_pagination(client, auth_helpers):
    admin = auth_helpers.create_user("admin.search@newtonite.com", "Admin Search", role="admin")
    team = auth_helpers.create_team("Search Team")
    headers = auth_helpers.get_auth_headers(admin)

    # Create 5 distinct tasks
    tasks = [
        {"title": "Database connection drop", "type": "production_incident", "priority": "urgent"},
        {"title": "Database replication lag", "type": "engineering_problem", "priority": "high"},
        {"title": "Billing statement mismatch", "type": "payment_investigation", "priority": "medium"},
        {"title": "Customer onboarding ticket", "type": "customer_issue", "priority": "low"},
        {"title": "Annual compliance check", "type": "compliance_request", "priority": "medium"},
    ]

    for t in tasks:
        client.post(
            "/api/v1/tasks",
            headers=headers,
            json={"title": t["title"], "type": t["type"], "priority": t["priority"], "team_id": team.id}
        )

    # Search for "Database"
    res_search = client.get("/api/v1/tasks?search=Database", headers=headers)
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 2
    for item in data_search["items"]:
        assert "Database" in item["title"]

    # Filter by priority=urgent
    res_urgent = client.get("/api/v1/tasks?priority=urgent", headers=headers)
    assert res_urgent.status_code == 200
    data_urgent = res_urgent.json()
    assert data_urgent["total"] == 1
    assert data_urgent["items"][0]["title"] == "Database connection drop"

    # Pagination test: page=1, page_size=2
    res_p1 = client.get("/api/v1/tasks?page=1&page_size=2", headers=headers)
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert len(data_p1["items"]) == 2
    assert data_p1["page"] == 1
    assert data_p1["page_size"] == 2
    assert data_p1["total"] == 5
    assert data_p1["total_pages"] == 3

    # Page 2
    res_p2 = client.get("/api/v1/tasks?page=2&page_size=2", headers=headers)
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["items"]) == 2
    assert data_p2["page"] == 2
