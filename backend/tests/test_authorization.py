import pytest


def test_member_cannot_create_task_for_other_team(client, auth_helpers):
    user_ops = auth_helpers.create_user("ops.user@newtonite.com", "Ops User")
    team_ops = auth_helpers.create_team("Ops Team")
    team_eng = auth_helpers.create_team("Eng Team")
    auth_helpers.add_membership(user_ops, team_ops, role="member")

    headers = auth_helpers.get_auth_headers(user_ops)

    # Attempt to create task in team_eng (unauthorized)
    res = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={
            "title": "Unauthorized task",
            "description": "Trying to bypass team boundary",
            "type": "operational_task",
            "priority": "medium",
            "team_id": team_eng.id
        }
    )
    assert res.status_code == 403
    assert "You can only create tasks for teams you belong to" in res.json()["detail"]


def test_member_can_create_task_for_own_team(client, auth_helpers):
    user_ops = auth_helpers.create_user("ops.creator@newtonite.com", "Ops Creator")
    team_ops = auth_helpers.create_team("Ops Team Alpha")
    auth_helpers.add_membership(user_ops, team_ops, role="member")

    headers = auth_helpers.get_auth_headers(user_ops)

    res = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={
            "title": "Authorized task creation",
            "description": "Legitimate work item",
            "type": "operational_task",
            "priority": "medium",
            "team_id": team_ops.id
        }
    )
    assert res.status_code == 201
    assert res.json()["title"] == "Authorized task creation"


def test_member_cannot_modify_task_in_other_team(client, auth_helpers):
    user_ops = auth_helpers.create_user("ops1@newtonite.com", "Ops 1")
    user_eng = auth_helpers.create_user("eng1@newtonite.com", "Eng 1")
    team_ops = auth_helpers.create_team("Ops Team Beta")
    team_eng = auth_helpers.create_team("Eng Team Beta")

    auth_helpers.add_membership(user_ops, team_ops, role="member")
    auth_helpers.add_membership(user_eng, team_eng, role="member")

    # Ops user creates a task
    ops_headers = auth_helpers.get_auth_headers(user_ops)
    create_res = client.post(
        "/api/v1/tasks",
        headers=ops_headers,
        json={
            "title": "Ops Task 1",
            "type": "operational_task",
            "team_id": team_ops.id
        }
    )
    assert create_res.status_code == 201
    task_id = create_res.json()["id"]
    version = create_res.json()["version"]

    # Eng user attempts to modify Ops task
    eng_headers = auth_helpers.get_auth_headers(user_eng)
    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=eng_headers,
        json={
            "version": version,
            "title": "Malicious Title Edit"
        }
    )
    assert patch_res.status_code in [403, 404]


def test_member_cannot_update_unowned_task_within_same_team(client, auth_helpers):
    member1 = auth_helpers.create_user("m1@newtonite.com", "Member 1")
    member2 = auth_helpers.create_user("m2@newtonite.com", "Member 2")
    team = auth_helpers.create_team("Shared Team")

    auth_helpers.add_membership(member1, team, role="member")
    auth_helpers.add_membership(member2, team, role="member")

    # Member 1 creates task
    m1_headers = auth_helpers.get_auth_headers(member1)
    create_res = client.post(
        "/api/v1/tasks",
        headers=m1_headers,
        json={
            "title": "M1 Private Task",
            "type": "operational_task",
            "team_id": team.id
        }
    )
    task_id = create_res.json()["id"]
    version = create_res.json()["version"]

    # Member 2 attempts to edit task they did not create and are not assigned to
    m2_headers = auth_helpers.get_auth_headers(member2)
    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=m2_headers,
        json={
            "version": version,
            "title": "M2 attempting unauthorized edit"
        }
    )
    assert patch_res.status_code == 403
    assert "Members can only update tasks they created or are assigned to" in patch_res.json()["detail"]


def test_member_cannot_reassign_task(client, auth_helpers):
    creator = auth_helpers.create_user("creator@newtonite.com", "Creator")
    assignee = auth_helpers.create_user("other@newtonite.com", "Other")
    team = auth_helpers.create_team("Ops Team Gamma")

    auth_helpers.add_membership(creator, team, role="member")
    auth_helpers.add_membership(assignee, team, role="member")

    headers = auth_helpers.get_auth_helpers_headers = auth_helpers.get_auth_headers(creator)
    create_res = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={"title": "My Task", "type": "operational_task", "team_id": team.id}
    )
    task_id = create_res.json()["id"]
    version = create_res.json()["version"]

    # Creator is ordinary member, attempts to reassign
    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=headers,
        json={"version": version, "assignee_id": assignee.id}
    )
    assert patch_res.status_code == 403
    assert "Only Team Leads or Administrators can reassign tasks" in patch_res.json()["detail"]


def test_team_lead_can_reassign_task_to_eligible_member(client, auth_helpers):
    lead = auth_helpers.create_user("lead@newtonite.com", "Team Lead")
    member = auth_helpers.create_user("eligible@newtonite.com", "Eligible Member")
    team = auth_helpers.create_team("Ops Team Delta")

    auth_helpers.add_membership(lead, team, role="team_lead")
    auth_helpers.add_membership(member, team, role="member")

    lead_headers = auth_helpers.get_auth_headers(lead)
    create_res = client.post(
        "/api/v1/tasks",
        headers=lead_headers,
        json={"title": "Lead Task", "type": "operational_task", "team_id": team.id}
    )
    task_id = create_res.json()["id"]
    version = create_res.json()["version"]

    # Lead reassigns to eligible member
    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=lead_headers,
        json={"version": version, "assignee_id": member.id}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["assignee_id"] == member.id


def test_cannot_assign_task_to_ineligible_user(client, auth_helpers):
    lead = auth_helpers.create_user("lead.inelig@newtonite.com", "Team Lead")
    outsider = auth_helpers.create_user("outsider@newtonite.com", "Outsider")
    team_a = auth_helpers.create_team("Team Alpha")
    team_b = auth_helpers.create_team("Team Beta")

    auth_helpers.add_membership(lead, team_a, role="team_lead")
    auth_helpers.add_membership(outsider, team_b, role="member")  # outsider not in team_a

    lead_headers = auth_helpers.get_auth_headers(lead)
    create_res = client.post(
        "/api/v1/tasks",
        headers=lead_headers,
        json={"title": "Team A Task", "type": "operational_task", "team_id": team_a.id}
    )
    task_id = create_res.json()["id"]
    version = create_res.json()["version"]

    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=lead_headers,
        json={"version": version, "assignee_id": outsider.id}
    )
    assert patch_res.status_code == 400
    assert "Assignee must be a member of the task's team" in patch_res.json()["detail"]
