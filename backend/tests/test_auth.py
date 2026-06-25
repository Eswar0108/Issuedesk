def test_register_user_success(client):
    payload = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "Password123!",
        "full_name": "Test User"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "testuser@example.com"
    assert "password_hash" not in data
    assert data["role"] == "user"

def test_register_user_duplicate_email(client):
    payload = {
        "username": "testuser1",
        "email": "dup@example.com",
        "password": "Password123!",
        "full_name": "User One"
    }
    # Register first user
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    
    # Register second user with same email
    payload["username"] = "testuser2"
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

def test_login_success(client):
    # Register a user
    payload = {
        "username": "loginuser",
        "email": "loginuser@example.com",
        "password": "Password123!",
        "full_name": "Login User"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    # Login
    login_payload = {
        "username_or_email": "loginuser@example.com",
        "password": "Password123!"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_password(client):
    # Register a user
    payload = {
        "username": "loginuser2",
        "email": "loginuser2@example.com",
        "password": "Password123!",
        "full_name": "Login User"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    # Login with wrong password
    login_payload = {
        "username_or_email": "loginuser2",
        "password": "WrongPassword123!"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "Invalid username/email or password" in response.json()["detail"]

def test_get_current_user_profile(client):
    # Register & Login
    payload = {
        "username": "profileuser",
        "email": "profileuser@example.com",
        "password": "Password123!",
        "full_name": "Profile User"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    login_payload = {
        "username_or_email": "profileuser",
        "password": "Password123!"
    }
    login_response = client.post("/api/v1/auth/login", json=login_payload)
    token = login_response.json()["access_token"]
    
    # Get profile
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "profileuser"
    assert data["email"] == "profileuser@example.com"
