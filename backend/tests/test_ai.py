import pytest
from unittest.mock import patch, MagicMock
from app.models.project import Project
from app.models.issue import Issue
from app.models.user import User
from app.models.project_member import ProjectMember
from app.core.security import hash_password, create_access_token
from app.services.llm.factory import LLMProviderFactory
from app.services.llm.gemini import GeminiProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.ollama import OllamaProvider


def get_auth_headers(user_id: int, username: str) -> dict:
    token = create_access_token(user_id=user_id, username=username)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_data(db_session):
    """Seed base data for testing AI endpoints."""
    # Create users
    owner = User(
        username="owner",
        email="owner@example.com",
        password_hash=hash_password("Password123"),
        full_name="Owner User"
    )
    assignee = User(
        username="assignee",
        email="assignee@example.com",
        password_hash=hash_password("Password123"),
        full_name="Assignee User"
    )
    db_session.add_all([owner, assignee])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(assignee)

    # Create project
    project = Project(
        name="Test Project",
        key="TEST",
        description="A project for testing",
        owner_id=owner.id
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # Add assignee as member of the project
    member = ProjectMember(
        user_id=assignee.id,
        project_id=project.id,
        role="member"
    )
    db_session.add(member)
    db_session.commit()

    return {
        "owner": owner,
        "assignee": assignee,
        "project": project
    }


def test_provider_factory():
    """Verify factory instantiates correct providers."""
    gemini = LLMProviderFactory.get_provider("gemini")
    assert isinstance(gemini, GeminiProvider)

    openai = LLMProviderFactory.get_provider("openai")
    assert isinstance(openai, OpenAIProvider)

    ollama = LLMProviderFactory.get_provider("ollama")
    assert isinstance(ollama, OllamaProvider)

    with pytest.raises(ValueError):
        LLMProviderFactory.get_provider("unsupported_provider")


@patch("app.api.v1.endpoints.ai.get_llm_provider")
def test_ai_chat_endpoint(mock_get_provider, client, db_session, test_data):
    """Test AI chat endpoint with mocked LLM provider."""
    mock_provider = MagicMock()
    mock_provider.is_configured.return_value = True
    mock_provider.generate_chat_response.return_value = "This is a mock answer from abstract provider."
    mock_get_provider.return_value = mock_provider

    # Seed an issue
    issue = Issue(
        title="Database timeout on login",
        description="The SQL database times out after 10 seconds of login attempts",
        project_id=test_data["project"].id,
        reporter_id=test_data["owner"].id
    )
    db_session.add(issue)
    db_session.commit()

    headers = get_auth_headers(test_data["owner"].id, test_data["owner"].username)
    payload = {
        "project_id": test_data["project"].id,
        "message": "Why does the login timeout?"
    }

    response = client.post("/api/v1/ai/chat", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["response"] == "This is a mock answer from abstract provider."
    mock_provider.generate_chat_response.assert_called_once()


@patch("app.repositories.issue_repository.get_llm_provider")
def test_semantic_search_endpoint(mock_get_provider, client, db_session, test_data):
    """Test semantic search sorting via Python similarity using mock embeddings."""
    mock_provider = MagicMock()
    mock_provider.is_configured.return_value = True
    mock_provider.get_embedding.return_value = [0.1, 0.2, 0.3]
    mock_get_provider.return_value = mock_provider

    # Create two issues with different embeddings
    issue1 = Issue(
        title="Login database error",
        description="Failed database connection",
        project_id=test_data["project"].id,
        reporter_id=test_data["owner"].id,
        embedding=[0.12, 0.18, 0.28]  # Very similar
    )
    issue2 = Issue(
        title="UI styling alignment",
        description="Footer is shifted slightly to the right",
        project_id=test_data["project"].id,
        reporter_id=test_data["owner"].id,
        embedding=[0.9, -0.1, 0.4]  # Very different
    )
    db_session.add_all([issue1, issue2])
    db_session.commit()

    headers = get_auth_headers(test_data["owner"].id, test_data["owner"].username)
    payload = {
        "project_id": test_data["project"].id,
        "query": "database connection issues",
        "limit": 5
    }

    response = client.post("/api/v1/ai/semantic-search", json=payload, headers=headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    assert results[0]["title"] == "Login database error"
    assert results[1]["title"] == "UI styling alignment"
    assert results[0]["similarity"] > results[1]["similarity"]


@patch("app.api.v1.endpoints.ai.get_llm_provider")
def test_enhance_description_endpoint(mock_get_provider, client, test_data):
    """Test description auto-enhancement endpoint."""
    mock_provider = MagicMock()
    mock_provider.enhance_description.return_value = {
        "enhanced_title": "Login: Database Connection Timeout",
        "enhanced_description": "**Summary**\nConnection timeout on db",
        "suggested_priority": "critical",
        "suggested_type": "bug"
    }
    mock_get_provider.return_value = mock_provider

    headers = get_auth_headers(test_data["owner"].id, test_data["owner"].username)
    payload = {
        "title": "db timeout",
        "description": "database timeout"
    }

    response = client.post("/api/v1/ai/enhance-description", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["enhanced_title"] == "Login: Database Connection Timeout"
    assert data["enhanced_description"] == "**Summary**\nConnection timeout on db"
    assert data["suggested_priority"] == "critical"
    assert data["suggested_type"] == "bug"


@patch("app.api.v1.endpoints.ai.get_llm_provider")
def test_suggest_assignee_endpoint(mock_get_provider, client, test_data):
    """Test assignee suggestion endpoint."""
    mock_provider = MagicMock()
    mock_provider.suggest_assignee.return_value = {
        "suggested_user_id": test_data["assignee"].id,
        "reasoning": "This user has lower workload and SQL expertise."
    }
    mock_get_provider.return_value = mock_provider

    headers = get_auth_headers(test_data["owner"].id, test_data["owner"].username)
    payload = {
        "project_id": test_data["project"].id,
        "title": "Fix SQL query execution time",
        "description": "Slow query optimization"
    }

    response = client.post("/api/v1/ai/suggest-assignee", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested_user_id"] == test_data["assignee"].id
    assert data["suggested_username"] == "assignee"
    assert "lower workload" in data["reasoning"]


@patch("app.api.v1.endpoints.ai.get_llm_provider")
def test_reindex_endpoint(mock_get_provider, client, db_session, test_data):
    """Test reindexing endpoint generates and saves embeddings."""
    mock_provider = MagicMock()
    mock_provider.is_configured.return_value = True
    mock_provider.get_embedding.return_value = [0.15, 0.25, 0.35]
    mock_get_provider.return_value = mock_provider

    issue = Issue(
        title="Unindexed bug",
        description="This bug has no embedding yet",
        project_id=test_data["project"].id,
        reporter_id=test_data["owner"].id,
        embedding=None
    )
    db_session.add(issue)
    db_session.commit()

    headers = get_auth_headers(test_data["owner"].id, test_data["owner"].username)
    payload = {
        "project_id": test_data["project"].id
    }

    response = client.post("/api/v1/ai/reindex", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["count"] == 1

    # Reload from DB and verify it now has the mocked embedding
    db_session.refresh(issue)
    assert issue.embedding == [0.15, 0.25, 0.35]
