def test_login_success_and_logout(client, auth_helpers):
    user = auth_helpers.create_user("test.auth@newtonite.com", "Test User", role="user")

    # Successful login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "test.auth@newtonite.com", "password": "Password123!"}
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["user"]["email"] == "test.auth@newtonite.com"
    assert "csrf_token" in data
    assert "newtonite_session" in login_res.cookies

    # Access /auth/me with cookie
    me_res = client.get("/api/v1/auth/me", cookies=login_res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == "test.auth@newtonite.com"

    # Logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200


def test_login_invalid_credentials(client, auth_helpers):
    auth_helpers.create_user("valid@newtonite.com", "Valid User", password="CorrectPassword123!")

    # Invalid password
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "valid@newtonite.com", "password": "WrongPassword!"}
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

    # Non-existent email
    res2 = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@newtonite.com", "password": "AnyPassword123!"}
    )
    assert res2.status_code == 401


def test_unauthenticated_request_rejected(client):
    res = client.get("/api/v1/tasks")
    assert res.status_code == 401
