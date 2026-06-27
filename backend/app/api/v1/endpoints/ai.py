from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.issue import Issue
from app.repositories.issue_repository import IssueRepository
from app.services.llm import get_llm_provider
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["AI / RAG Operations"])


# ── Schemas ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    project_id: int
    message: str
    history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    response: str


class SemanticSearchRequest(BaseModel):
    project_id: int
    query: str
    limit: Optional[int] = 5


class SemanticSearchItem(BaseModel):
    id: int
    title: str
    issue_code: str
    status: str
    priority: str
    issue_type: str
    similarity: float


class EnhanceDescriptionRequest(BaseModel):
    title: str
    description: str


class EnhanceDescriptionResponse(BaseModel):
    enhanced_title: str
    enhanced_description: str
    suggested_priority: str
    suggested_type: str


class SuggestAssigneeRequest(BaseModel):
    project_id: int
    title: str
    description: str


class SuggestAssigneeResponse(BaseModel):
    suggested_user_id: Optional[int] = None
    suggested_username: Optional[str] = None
    reasoning: str


class ReindexRequest(BaseModel):
    project_id: int


class ReindexResponse(BaseModel):
    count: int
    message: str


class AIInfoResponse(BaseModel):
    provider: str
    ai_name: str


# ── Helper functions ─────────────────────────────────────────

def verify_project_membership(db: Session, project_id: int, user_id: int) -> Project:
    """Ensure the user is a member of the project."""
    project = db.query(Project).filter(Project.id == project_id, Project.is_active == True).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Check if user is owner or member
    if project.owner_id == user_id:
        return project
        
    membership = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project."
        )
    return project


# ── Endpoint Routes ──────────────────────────────────────────

@router.get("/info", response_model=AIInfoResponse)
def get_ai_info():
    """
    Get active AI provider name and customized AI assistant name.
    """
    return AIInfoResponse(
        provider=settings.LLM_PROVIDER,
        ai_name=settings.AI_NAME
    )


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RAG-powered chat with issues and comments of a project.
    """
    # 1. Verify membership
    project = verify_project_membership(db, payload.project_id, current_user.id)

    # 2. Retrieve all project issues and comments to construct RAG context
    issues = (
        db.query(Issue)
        .filter(Issue.project_id == payload.project_id)
        .all()
    )

    if not issues:
        context = f"No issues have been created in project '{project.name}' ({project.key}) yet."
    else:
        # Compute exact counts and statistical breakdown
        total_issues = len(issues)
        by_priority = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        by_status = {"open": 0, "in_progress": 0, "resolved": 0, "closed": 0, "reopened": 0}
        by_type = {"bug": 0, "feature": 0, "task": 0, "improvement": 0}

        context_parts = []
        for issue in issues:
            p_val = issue.priority.value if hasattr(issue.priority, "value") else str(issue.priority).lower()
            s_val = issue.status.value if hasattr(issue.status, "value") else str(issue.status).lower()
            t_val = issue.issue_type.value if hasattr(issue.issue_type, "value") else str(issue.issue_type).lower()

            if p_val in by_priority: by_priority[p_val] += 1
            if s_val in by_status: by_status[s_val] += 1
            if t_val in by_type: by_type[t_val] += 1

            comments_str = ""
            if issue.comments:
                comments_str = "\n  Comments:\n" + "\n".join(
                    [f"    - {c.user.username}: {c.content}" for c in issue.comments]
                )
            context_parts.append(
                f"Issue Code: {issue.issue_code}\n"
                f"  Title: {issue.title}\n"
                f"  Status: {s_val}\n"
                f"  Priority: {p_val}\n"
                f"  Type: {t_val}\n"
                f"  Assignee: {issue.assignee.username if issue.assignee else 'Unassigned'}\n"
                f"  Reporter: {issue.reporter.username if issue.reporter else 'Unknown'}\n"
                f"  Description: {issue.description or 'No description provided.'}\n"
                f"  Start Date: {issue.start_date.strftime('%Y-%m-%d') if issue.start_date else 'None'}"
                f"{comments_str}"
            )

        summary_header = (
            f"=== COMPLETE PROJECT STATISTICAL OVERVIEW FOR '{project.name}' (Key: {project.key}) ===\n"
            f"Total Issues in Database: {total_issues}\n"
            f"Breakdown by Priority: Critical={by_priority['critical']}, High={by_priority['high']}, Medium={by_priority['medium']}, Low={by_priority['low']}\n"
            f"Breakdown by Status: Open={by_status['open']}, In Progress={by_status['in_progress']}, Resolved={by_status['resolved']}, Closed={by_status['closed']}, Reopened={by_status['reopened']}\n"
            f"Breakdown by Type: Bug={by_type['bug']}, Feature={by_type['feature']}, Task={by_type['task']}, Improvement={by_type['improvement']}\n"
            f"===============================================================================\n\n"
            f"=== DETAILED ISSUE LIST AND COMMENTS ===\n"
        )
        context = summary_header + "\n---\n".join(context_parts)

    # 3. Call AI Provider
    response_text = get_llm_provider().generate_chat_response(
        prompt=payload.message,
        context=context,
        history=payload.history
    )
    return ChatResponse(response=response_text)


@router.post("/semantic-search", response_model=List[SemanticSearchItem])
def semantic_search(
    payload: SemanticSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search project issues semantically using Gemini embeddings and Python-based cosine similarity.
    """
    # Verify membership
    verify_project_membership(db, payload.project_id, current_user.id)

    issue_repo = IssueRepository(db)
    results = issue_repo.search_semantic(
        query=payload.query,
        project_id=payload.project_id,
        limit=payload.limit
    )

    response_items = []
    for issue, score in results:
        status_val = issue.status.value if hasattr(issue.status, "value") else str(issue.status)
        priority_val = issue.priority.value if hasattr(issue.priority, "value") else str(issue.priority)
        type_val = issue.issue_type.value if hasattr(issue.issue_type, "value") else str(issue.issue_type)
        
        response_items.append(
            SemanticSearchItem(
                id=issue.id,
                title=issue.title,
                issue_code=issue.issue_code or "",
                status=status_val,
                priority=priority_val,
                issue_type=type_val,
                similarity=score
            )
        )
    return response_items


@router.post("/enhance-description", response_model=EnhanceDescriptionResponse)
def enhance_description(
    payload: EnhanceDescriptionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Auto-enhances issue title and description using LLM guidance.
    """
    result = get_llm_provider().enhance_description(
        title=payload.title,
        description=payload.description
    )
    return EnhanceDescriptionResponse(
        enhanced_title=result.get("enhanced_title", payload.title),
        enhanced_description=result.get("enhanced_description", payload.description),
        suggested_priority=result.get("suggested_priority", "medium"),
        suggested_type=result.get("suggested_type", "bug")
    )


@router.post("/suggest-assignee", response_model=SuggestAssigneeResponse)
def suggest_assignee(
    payload: SuggestAssigneeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Suggests the best project member to assign to a new/existing ticket based on workload and context.
    """
    project = verify_project_membership(db, payload.project_id, current_user.id)

    # 1. Fetch all members
    members = []
    # Add owner
    members.append({
        "id": project.owner.id,
        "username": project.owner.username,
        "role": "owner"
    })
    # Add members
    for m in project.members:
        members.append({
            "id": m.user.id,
            "username": m.user.username,
            "role": m.role
        })

    # Deduplicate in case owner is also in members table (shouldn't be, but to be safe)
    unique_members = {m["id"]: m for m in members}.values()

    # 2. Fetch active workloads
    workloads = []
    for m in unique_members:
        active_count = (
            db.query(Issue)
            .filter(
                Issue.project_id == payload.project_id,
                Issue.assignee_id == m["id"],
                Issue.status.in_(["open", "in_progress", "reopened"])
            )
            .count()
        )
        workloads.append({
            "user_id": m["id"],
            "count": active_count
        })

    # 3. Request AI recommendation
    result = get_llm_provider().suggest_assignee(
        title=payload.title,
        description=payload.description,
        members=list(unique_members),
        workloads=workloads
    )

    sug_id = result.get("suggested_user_id")
    sug_username = None
    if sug_id:
        match = next((m for m in unique_members if m["id"] == sug_id), None)
        if match:
            sug_username = match["username"]

    return SuggestAssigneeResponse(
        suggested_user_id=sug_id,
        suggested_username=sug_username,
        reasoning=result.get("reasoning", "No recommendations found.")
    )


@router.post("/reindex", response_model=ReindexResponse)
def reindex_issues(
    payload: ReindexRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate embeddings for all existing issues in a project that don't have them yet.
    """
    verify_project_membership(db, payload.project_id, current_user.id)
    
    provider = get_llm_provider()
    if not provider.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{settings.LLM_PROVIDER.upper()} API Key is not configured. Reindexing requires a valid key."
        )

    issues = (
        db.query(Issue)
        .filter(Issue.project_id == payload.project_id)
        .all()
    )

    reindexed_count = 0
    for issue in issues:
        # Generate new embedding
        text = f"Title: {issue.title}\nDescription: {issue.description or ''}"
        emb = provider.get_embedding(text)
        if emb:
            issue.embedding = emb
            db.add(issue)
            reindexed_count += 1
            
    if reindexed_count > 0:
        db.commit()

    return ReindexResponse(
        count=reindexed_count,
        message=f"Successfully reindexed {reindexed_count} issues out of {len(issues)} total issues."
    )
