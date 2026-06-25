def test_create_project_success(client):
    # Register & Login
    payload = {
        "username": "owneruser",
        "email": "owner@example.com",
        "password": "Password123!",
        "full_name": "Project Owner"
    }
    client.post("/api/v1/auth/register", json=payload)
    login_response = client.post("/api/v1/auth/login", json={
        "username_or_email": "owneruser",
        "password": "Password123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create project
    proj_payload = {
        "name": "Test Project",
        "key": "TESTPROJ",
        "description": "A project to test"
    }
    response = client.post("/api/v1/projects", json=proj_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["key"] == "TESTPROJ"
    assert data["owner_id"] is not None
    assert data["member_count"] == 1

def test_add_member_by_email_success(client):
    # 1. Register owner & login
    client.post("/api/v1/auth/register", json={
        "username": "owneruser2", "email": "owner2@example.com",
        "password": "Password123!", "full_name": "Owner"
    })
    login_response = client.post("/api/v1/auth/login", json={
        "username_or_email": "owneruser2", "password": "Password123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Register candidate member
    client.post("/api/v1/auth/register", json={
        "username": "memberuser", "email": "member@example.com",
        "password": "Password123!", "full_name": "Member"
    })
    
    # 3. Create project
    proj_response = client.post("/api/v1/projects", json={
        "name": "Project Two", "key": "PROJTWO"
    }, headers=headers)
    project_id = proj_response.json()["id"]
    
    # 4. Add member by email
    add_payload = {
        "email": "member@example.com",
        "role": "member"
    }
    response = client.post(f"/api/v1/projects/{project_id}/members", json=add_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "memberuser"
    assert data["role"] == "member"
    
    # 5. Fetch project details to verify members list
    detail_response = client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert detail_response.status_code == 200
    detail_data = detail_response.json()
    assert len(detail_data["members"]) == 2
    assert any(m["username"] == "memberuser" for m in detail_data["members"])

def test_add_member_not_found(client):
    # Register owner & login
    client.post("/api/v1/auth/register", json={
        "username": "owneruser3", "email": "owner3@example.com",
        "password": "Password123!"
    })
    login_response = client.post("/api/v1/auth/login", json={
        "username_or_email": "owneruser3", "password": "Password123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create project
    proj_response = client.post("/api/v1/projects", json={
        "name": "Project Three", "key": "PROJTHREE"
    }, headers=headers)
    project_id = proj_response.json()["id"]
    
    # Add non-existent member
    add_payload = {
        "email": "nonexistent@example.com",
        "role": "member"
    }
    response = client.post(f"/api/v1/projects/{project_id}/members", json=add_payload, headers=headers)
    assert response.status_code == 404
    assert "User with username or email" in response.json()["detail"]
