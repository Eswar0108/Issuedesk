def test_create_issue_success(client):
    # 1. Register & login
    client.post("/api/v1/auth/register", json={
        "username": "issueowner", "email": "issueowner@example.com",
        "password": "Password123!"
    })
    login_response = client.post("/api/v1/auth/login", json={
        "username_or_email": "issueowner", "password": "Password123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create project
    proj_response = client.post("/api/v1/projects", json={
        "name": "Project for Issues", "key": "ISSPROJ"
    }, headers=headers)
    project_id = proj_response.json()["id"]
    
    # 3. Create issue
    issue_payload = {
        "title": "A test bug",
        "description": "Details of the bug",
        "priority": "high",
        "issue_type": "bug",
        "project_id": project_id
    }
    response = client.post("/api/v1/issues", json=issue_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "A test bug"
    assert data["status"] == "open"
    assert data["priority"] == "high"
    assert data["issue_type"] == "bug"
    assert data["reporter_username"] == "issueowner"

def test_add_comment_success(client):
    # 1. Register & login
    client.post("/api/v1/auth/register", json={
        "username": "commenter", "email": "commenter@example.com",
        "password": "Password123!"
    })
    login_response = client.post("/api/v1/auth/login", json={
        "username_or_email": "commenter", "password": "Password123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create project & issue
    proj_response = client.post("/api/v1/projects", json={
        "name": "Project Comments", "key": "COMMPROJ"
    }, headers=headers)
    project_id = proj_response.json()["id"]
    
    issue_response = client.post("/api/v1/issues", json={
        "title": "Comment test",
        "priority": "low",
        "issue_type": "task",
        "project_id": project_id
    }, headers=headers)
    issue_id = issue_response.json()["id"]
    
    # 3. Add comment
    comment_payload = {
        "content": "This is a comment."
    }
    response = client.post(f"/api/v1/issues/{issue_id}/comments", json=comment_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "This is a comment."
    assert data["author_username"] == "commenter"

def test_create_issue_date_validation(client):
    # 1. Register & login
    client.post("/api/v1/auth/register", json={
        "username": "dateowner", "email": "dateowner@example.com",
        "password": "Password123!"
    })
    login_response = client.post("/api/v1/auth/login", json={
        "username_or_email": "dateowner", "password": "Password123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create project with start_date set to 2026-07-01
    proj_response = client.post("/api/v1/projects", json={
        "name": "Date Project", 
        "key": "DATEPROJ",
        "start_date": "2026-07-01"
    }, headers=headers)
    assert proj_response.status_code == 201
    project_id = proj_response.json()["id"]
    
    # 3. Create issue with start_date BEFORE project start date (should fail)
    bad_issue_payload = {
        "title": "Invalid Start Date",
        "project_id": project_id,
        "start_date": "2026-06-30"
    }
    response = client.post("/api/v1/issues", json=bad_issue_payload, headers=headers)
    assert response.status_code == 400
    assert "cannot be before project start date" in response.json()["detail"]
    
    # 4. Create issue with start_date AFTER project start date (should succeed)
    good_issue_payload = {
        "title": "Valid Start Date",
        "project_id": project_id,
        "start_date": "2026-07-02"
    }
    response = client.post("/api/v1/issues", json=good_issue_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    issue_id = data["id"]
    assert data["start_date"] == "2026-07-02"
    
    # 5. Update issue with start_date BEFORE project start date (should fail)
    update_payload = {
        "start_date": "2026-06-25"
    }
    response = client.patch(f"/api/v1/issues/{issue_id}", json=update_payload, headers=headers)
    assert response.status_code == 400
    assert "cannot be before project start date" in response.json()["detail"]
    
    # 6. Update issue with start_date AFTER project start date (should succeed)
    update_payload = {
        "start_date": "2026-07-05"
    }
    response = client.patch(f"/api/v1/issues/{issue_id}", json=update_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["start_date"] == "2026-07-05"
