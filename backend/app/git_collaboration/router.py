from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.permissions.dependencies import get_current_user
from app.models.user import User
from app.models.git_collaboration import ProjectGitRepository, TaskGitReference, ProjectGitConnection
from app.common.responses import success_response
from app.git_collaboration.schemas import (
    RepositoryRegisterRequest,
    RepositoryUpdateRequest,
    TaskGitReferenceCreateRequest,
    TaskGitReferenceUpdateRequest,
    GitHubConnectRequest,
)
from app.git_collaboration import service

router = APIRouter(tags=["Git Collaboration"])


def format_repo_response(repo: ProjectGitRepository | None) -> dict | None:
    if not repo:
        return None
    return {
        "id": str(repo.id),
        "project_id": str(repo.project_id),
        "repository_url": repo.repository_url,
        "repository_name": repo.repository_name,
        "created_by": str(repo.created_by) if repo.created_by else None,
        "created_at": repo.created_at.isoformat() if repo.created_at else None,
        "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
    }


def format_reference_response(ref: TaskGitReference) -> dict:
    creator_name = None
    if ref.creator:
        creator_name = f"{ref.creator.first_name} {ref.creator.last_name}".strip()

    task_status_val = None
    task_priority_val = None
    if ref.task:
        task_status_val = ref.task.status.value if hasattr(ref.task.status, "value") else str(ref.task.status)
        task_priority_val = ref.task.priority.value if hasattr(ref.task.priority, "value") else str(ref.task.priority)

    ref_type_val = ref.reference_type.value if hasattr(ref.reference_type, "value") else str(ref.reference_type)

    return {
        "id": str(ref.id),
        "project_id": str(ref.project_id),
        "task_id": str(ref.task_id),
        "task_title": ref.task.title if ref.task else "Unknown Task",
        "task_status": task_status_val,
        "task_priority": task_priority_val,
        "reference_type": ref_type_val,
        "commit_hash": ref.commit_hash,
        "commit_url": ref.commit_url,
        "pull_request_url": ref.pull_request_url,
        "description": ref.description,
        "created_by": str(ref.created_by) if ref.created_by else None,
        "creator_name": creator_name,
        "created_at": ref.created_at.isoformat() if ref.created_at else None,
        "updated_at": ref.updated_at.isoformat() if ref.updated_at else None,
    }


def format_connection_response(conn: ProjectGitConnection | None) -> dict:
    if not conn:
        return {"connected": False, "connection": None}
    return {
        "connected": True,
        "connection": {
            "id": str(conn.id),
            "project_id": str(conn.project_id),
            "github_username": conn.github_username,
            "github_user_id": conn.github_user_id,
            "github_avatar_url": conn.github_avatar_url,
            "token_type": conn.token_type,
            "is_valid": conn.is_valid,
            "last_tested_at": conn.last_tested_at.isoformat() if conn.last_tested_at else None,
            "connected_at": conn.created_at.isoformat() if conn.created_at else None,
        },
    }


# --- Repository Endpoints ---

@router.get("/projects/{project_id}/git/repository", status_code=status.HTTP_200_OK)
def get_repository(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves the registered primary GitHub repository for this project."""
    repo = service.get_repository(db, project_id, current_user)
    return success_response(
        message="Repository retrieved successfully.",
        data=format_repo_response(repo),
    )


@router.post("/projects/{project_id}/git/repository", status_code=status.HTTP_201_CREATED)
def register_repository(
    project_id: UUID,
    request: RepositoryRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Registers a primary GitHub repository for this project."""
    repo = service.register_repository(db, project_id, current_user, request)
    return success_response(
        message="GitHub repository registered successfully.",
        data=format_repo_response(repo),
    )


@router.patch("/projects/{project_id}/git/repository", status_code=status.HTTP_200_OK)
def update_repository(
    project_id: UUID,
    request: RepositoryUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates the registered repository URL or display name."""
    repo = service.update_repository(db, project_id, current_user, request)
    return success_response(
        message="GitHub repository updated successfully.",
        data=format_repo_response(repo),
    )


@router.delete("/projects/{project_id}/git/repository", status_code=status.HTTP_200_OK)
def remove_repository(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Removes the repository association. Historical task-Git links are safely preserved."""
    service.remove_repository(db, project_id, current_user)
    return success_response(
        message="GitHub repository association removed successfully.",
        data=None,
    )


# --- Task Git Reference Endpoints ---

@router.get("/projects/{project_id}/git/references", status_code=status.HTTP_200_OK)
def list_task_git_references(
    project_id: UUID,
    task_id: UUID | None = Query(None, description="Optional task ID filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists task–Git references for this project, sorted by newest first."""
    refs = service.list_task_git_references(db, project_id, current_user, task_id=task_id)
    return success_response(
        message="Git references retrieved successfully.",
        data=[format_reference_response(r) for r in refs],
    )


@router.post("/projects/{project_id}/git/references", status_code=status.HTTP_201_CREATED)
def create_task_git_reference(
    project_id: UUID,
    request: TaskGitReferenceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new task–Git commit or pull-request reference."""
    ref = service.create_task_git_reference(db, project_id, current_user, request)
    return success_response(
        message="Git reference linked successfully.",
        data=format_reference_response(ref),
    )


@router.patch("/projects/{project_id}/git/references/{reference_id}", status_code=status.HTTP_200_OK)
def update_task_git_reference(
    project_id: UUID,
    reference_id: UUID,
    request: TaskGitReferenceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates an existing task–Git reference."""
    ref = service.update_task_git_reference(db, project_id, reference_id, current_user, request)
    return success_response(
        message="Git reference updated successfully.",
        data=format_reference_response(ref),
    )


@router.delete("/projects/{project_id}/git/references/{reference_id}", status_code=status.HTTP_200_OK)
def delete_task_git_reference(
    project_id: UUID,
    reference_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes an existing task–Git reference."""
    service.delete_task_git_reference(db, project_id, reference_id, current_user)
    return success_response(
        message="Git reference deleted successfully.",
        data=None,
    )


# --- GitHub Secure PAT Connection Endpoints ---

@router.get("/projects/{project_id}/git/connection", status_code=status.HTTP_200_OK)
def get_github_connection(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves current GitHub PAT connection status and account identity (never returns the PAT)."""
    conn = service.get_github_connection(db, project_id, current_user)
    return success_response(
        message="GitHub connection status retrieved.",
        data=format_connection_response(conn),
    )


@router.post("/projects/{project_id}/git/connection", status_code=status.HTTP_200_OK)
def connect_github_pat(
    project_id: UUID,
    request: GitHubConnectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Securely connects and encrypts a GitHub Personal Access Token for the project."""
    conn = service.connect_github_pat(db, project_id, current_user, request)
    return success_response(
        message=f"Successfully connected GitHub account @{conn.github_username}.",
        data=format_connection_response(conn),
    )


@router.post("/projects/{project_id}/git/connection/test", status_code=status.HTTP_200_OK)
def test_github_connection(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tests the encrypted GitHub PAT against the GitHub API and verified repository."""
    result = service.test_github_connection(db, project_id, current_user)
    return success_response(
        message=result["message"],
        data=result,
    )


@router.delete("/projects/{project_id}/git/connection", status_code=status.HTTP_200_OK)
def disconnect_github(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnects and removes the encrypted GitHub PAT. Historical task links remain preserved."""
    service.disconnect_github(db, project_id, current_user)
    return success_response(
        message="GitHub connection removed successfully.",
        data={"connected": False, "connection": None},
    )


# --- GitHub REST API Live Commits & PRs Endpoints ---

@router.get("/projects/{project_id}/git/github/commits", status_code=status.HTTP_200_OK)
def get_github_commits(
    project_id: UUID,
    per_page: int = Query(20, ge=1, le=50),
    page: int = Query(1, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetches real commits from the GitHub repository using the project's encrypted token."""
    commits = service.fetch_project_github_commits(db, project_id, current_user, per_page=per_page, page=page)
    return success_response(
        message="Commits retrieved from GitHub.",
        data=commits,
    )


@router.get("/projects/{project_id}/git/github/pulls", status_code=status.HTTP_200_OK)
def get_github_pull_requests(
    project_id: UUID,
    state: str = Query("all", pattern="^(all|open|closed)$"),
    per_page: int = Query(20, ge=1, le=50),
    page: int = Query(1, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetches real pull requests from the GitHub repository using the project's encrypted token."""
    pulls = service.fetch_project_github_pull_requests(db, project_id, current_user, state=state, per_page=per_page, page=page)
    return success_response(
        message="Pull requests retrieved from GitHub.",
        data=pulls,
    )
