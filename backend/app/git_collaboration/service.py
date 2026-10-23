import logging
from uuid import UUID
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session, joinedload

from datetime import datetime, timezone
import re
from app.models.git_collaboration import ProjectGitRepository, TaskGitReference, ProjectGitConnection
from app.models.enums import CompanyRole, ProjectRole, GitReferenceType
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User
from app.common.exceptions import (
    BaseBusinessException,
    Forbidden,
    ResourceNotFound,
)
from app.git_collaboration.schemas import (
    RepositoryRegisterRequest,
    RepositoryUpdateRequest,
    TaskGitReferenceCreateRequest,
    TaskGitReferenceUpdateRequest,
    GitHubConnectRequest,
    GITHUB_REPO_REGEX,
    normalize_github_repo_url,
    normalize_github_commit_url,
    normalize_github_pr_url,
    validate_commit_hash_str,
)
from app.git_collaboration import crypto
from app.git_collaboration import github_client

logger = logging.getLogger(__name__)

CONTRIBUTOR_ROLES = {
    ProjectRole.PROJECT_MANAGER,
    ProjectRole.TEAM_LEAD,
    ProjectRole.DEVELOPER,
}

MANAGE_ROLES = {
    ProjectRole.PROJECT_MANAGER,
    ProjectRole.TEAM_LEAD,
}


def is_cto(user: User) -> bool:
    if user.role == CompanyRole.OWNER:
        return True
    if user.designation and "cto" in user.designation.lower():
        return True
    return False


def get_project_member(db: Session, project_id: UUID, user_id: UUID) -> ProjectMember | None:
    return db.execute(
        select(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    ).scalar_one_or_none()


def verify_project_access(
    db: Session,
    project_id: UUID,
    user: User,
    require_manage: bool = False,
    require_contributor: bool = False,
) -> tuple[Project, ProjectMember | None]:
    """
    Verifies tenant isolation and project membership permissions.
    """
    project = db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
    if not project:
        raise ResourceNotFound("Project not found.")

    if str(project.company_id) != str(user.company_id):
        raise Forbidden("You do not have access to this project.")

    member = get_project_member(db, project_id, user.id)
    is_admin_or_owner = user.role in {CompanyRole.OWNER, CompanyRole.ADMIN} or is_cto(user)

    if not is_admin_or_owner and not member:
        raise Forbidden("You are not a member of this project.")

    if require_manage:
        can_manage = is_admin_or_owner or (member is not None and member.role in MANAGE_ROLES)
        if not can_manage:
            raise Forbidden("You do not have permission to manage repository settings for this project.")

    if require_contributor:
        can_contribute = is_admin_or_owner or (member is not None and member.role in CONTRIBUTOR_ROLES)
        if not can_contribute:
            raise Forbidden("You do not have permission to add or modify Git references for this project.")

    return project, member


# --- Repository Management ---

def get_repository(db: Session, project_id: UUID, user: User) -> ProjectGitRepository | None:
    verify_project_access(db, project_id, user)
    return db.execute(
        select(ProjectGitRepository).filter(ProjectGitRepository.project_id == project_id)
    ).scalar_one_or_none()


def register_repository(
    db: Session,
    project_id: UUID,
    user: User,
    data: RepositoryRegisterRequest,
) -> ProjectGitRepository:
    verify_project_access(db, project_id, user, require_manage=True)

    existing = db.execute(
        select(ProjectGitRepository).filter(ProjectGitRepository.project_id == project_id)
    ).scalar_one_or_none()

    if existing:
        raise BaseBusinessException(
            "A primary repository is already registered for this project.",
            status_code=409,
        )

    # Derive display name from repo URL if not given
    repo_name = data.repository_name
    if not repo_name:
        parts = data.repository_url.rstrip("/").split("/")
        if len(parts) >= 2:
            repo_name = f"{parts[-2]}/{parts[-1]}"

    repo = ProjectGitRepository(
        project_id=project_id,
        repository_url=data.repository_url,
        repository_name=repo_name,
        created_by=user.id,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    logger.info("Registered repository %s for project %s by user %s", repo.repository_url, project_id, user.id)
    return repo


def update_repository(
    db: Session,
    project_id: UUID,
    user: User,
    data: RepositoryUpdateRequest,
) -> ProjectGitRepository:
    verify_project_access(db, project_id, user, require_manage=True)

    repo = db.execute(
        select(ProjectGitRepository).filter(ProjectGitRepository.project_id == project_id)
    ).scalar_one_or_none()

    if not repo:
        raise ResourceNotFound("No registered repository found for this project.")

    if data.repository_url is not None:
        repo.repository_url = data.repository_url
    if data.repository_name is not None:
        repo.repository_name = data.repository_name

    db.commit()
    db.refresh(repo)
    logger.info("Updated repository %s for project %s by user %s", repo.id, project_id, user.id)
    return repo


def remove_repository(
    db: Session,
    project_id: UUID,
    user: User,
) -> None:
    verify_project_access(db, project_id, user, require_manage=True)

    repo = db.execute(
        select(ProjectGitRepository).filter(ProjectGitRepository.project_id == project_id)
    ).scalar_one_or_none()

    if not repo:
        raise ResourceNotFound("No registered repository found for this project.")

    db.delete(repo)
    db.commit()
    logger.info("Removed repository association for project %s by user %s (Task links preserved)", project_id, user.id)


# --- Task Git References ---

def list_task_git_references(
    db: Session,
    project_id: UUID,
    user: User,
    task_id: UUID | None = None,
) -> list[TaskGitReference]:
    verify_project_access(db, project_id, user)

    query = (
        select(TaskGitReference)
        .options(
            joinedload(TaskGitReference.task),
            joinedload(TaskGitReference.creator),
        )
        .filter(TaskGitReference.project_id == project_id)
    )

    if task_id:
        # Verify task belongs to this project
        task = db.execute(select(Task).filter(Task.id == task_id)).scalar_one_or_none()
        if not task or str(task.project_id) != str(project_id):
            raise BaseBusinessException("Task does not belong to this project.", status_code=400)
        query = query.filter(TaskGitReference.task_id == task_id)

    query = query.order_by(desc(TaskGitReference.created_at))
    return list(db.execute(query).scalars().all())


def create_task_git_reference(
    db: Session,
    project_id: UUID,
    user: User,
    data: TaskGitReferenceCreateRequest,
) -> TaskGitReference:
    verify_project_access(db, project_id, user, require_contributor=True)

    task = db.execute(select(Task).filter(Task.id == data.task_id)).scalar_one_or_none()
    if not task:
        raise ResourceNotFound("Task not found.")

    if str(task.project_id) != str(project_id):
        raise BaseBusinessException("Selected task does not belong to this project.", status_code=400)

    # Duplicate checking
    if data.reference_type == GitReferenceType.COMMIT:
        existing_commit = db.execute(
            select(TaskGitReference).filter(
                TaskGitReference.task_id == data.task_id,
                TaskGitReference.commit_hash == data.commit_hash,
            )
        ).scalar_one_or_none()
        if existing_commit:
            raise BaseBusinessException(
                "This commit hash is already linked to this task.",
                status_code=409,
            )
    elif data.reference_type == GitReferenceType.PULL_REQUEST:
        existing_pr = db.execute(
            select(TaskGitReference).filter(
                TaskGitReference.task_id == data.task_id,
                TaskGitReference.pull_request_url == data.pull_request_url,
            )
        ).scalar_one_or_none()
        if existing_pr:
            raise BaseBusinessException(
                "This pull request URL is already linked to this task.",
                status_code=409,
            )

    ref = TaskGitReference(
        project_id=project_id,
        task_id=data.task_id,
        reference_type=data.reference_type,
        commit_hash=data.commit_hash,
        commit_url=data.commit_url,
        pull_request_url=data.pull_request_url,
        description=data.description,
        created_by=user.id,
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)

    # Re-fetch with joined relations
    ref_loaded = db.execute(
        select(TaskGitReference)
        .options(
            joinedload(TaskGitReference.task),
            joinedload(TaskGitReference.creator),
        )
        .filter(TaskGitReference.id == ref.id)
    ).scalar_one()

    logger.info("Created Git reference %s for task %s in project %s", ref.id, data.task_id, project_id)
    return ref_loaded


def update_task_git_reference(
    db: Session,
    project_id: UUID,
    reference_id: UUID,
    user: User,
    data: TaskGitReferenceUpdateRequest,
) -> TaskGitReference:
    project, member = verify_project_access(db, project_id, user, require_contributor=True)

    ref = db.execute(
        select(TaskGitReference)
        .options(
            joinedload(TaskGitReference.task),
            joinedload(TaskGitReference.creator),
        )
        .filter(
            TaskGitReference.id == reference_id,
            TaskGitReference.project_id == project_id,
        )
    ).scalar_one_or_none()

    if not ref:
        raise ResourceNotFound("Git reference not found.")

    # Permissions: creator, or PM/TL/Owner/Admin
    is_admin_or_owner = user.role in {CompanyRole.OWNER, CompanyRole.ADMIN} or is_cto(user)
    is_pm_or_tl = member is not None and member.role in MANAGE_ROLES
    is_creator = str(ref.created_by) == str(user.id)

    if not (is_admin_or_owner or is_pm_or_tl or is_creator):
        raise Forbidden("You do not have permission to modify this Git reference.")

    new_type = data.reference_type or ref.reference_type
    ref.reference_type = new_type

    if new_type == GitReferenceType.COMMIT:
        if data.commit_hash is not None:
            c_hash = validate_commit_hash_str(data.commit_hash)
            # Duplicate check
            existing = db.execute(
                select(TaskGitReference).filter(
                    TaskGitReference.task_id == ref.task_id,
                    TaskGitReference.commit_hash == c_hash,
                    TaskGitReference.id != ref.id,
                )
            ).scalar_one_or_none()
            if existing:
                raise BaseBusinessException("This commit hash is already linked to this task.", status_code=409)
            ref.commit_hash = c_hash

        if data.commit_url is not None:
            c_url = normalize_github_commit_url(data.commit_url) if data.commit_url.strip() else None
            ref.commit_url = c_url

        ref.pull_request_url = None
    elif new_type == GitReferenceType.PULL_REQUEST:
        if data.pull_request_url is not None:
            pr_url = normalize_github_pr_url(data.pull_request_url)
            # Duplicate check
            existing = db.execute(
                select(TaskGitReference).filter(
                    TaskGitReference.task_id == ref.task_id,
                    TaskGitReference.pull_request_url == pr_url,
                    TaskGitReference.id != ref.id,
                )
            ).scalar_one_or_none()
            if existing:
                raise BaseBusinessException("This pull request URL is already linked to this task.", status_code=409)
            ref.pull_request_url = pr_url

        ref.commit_hash = None
        ref.commit_url = None

    if data.description is not None:
        ref.description = data.description

    db.commit()
    db.refresh(ref)
    logger.info("Updated Git reference %s in project %s", ref.id, project_id)
    return ref


def delete_task_git_reference(
    db: Session,
    project_id: UUID,
    reference_id: UUID,
    user: User,
) -> None:
    project, member = verify_project_access(db, project_id, user, require_contributor=True)

    ref = db.execute(
        select(TaskGitReference).filter(
            TaskGitReference.id == reference_id,
            TaskGitReference.project_id == project_id,
        )
    ).scalar_one_or_none()

    if not ref:
        raise ResourceNotFound("Git reference not found.")

    is_admin_or_owner = user.role in {CompanyRole.OWNER, CompanyRole.ADMIN} or is_cto(user)
    is_pm_or_tl = member is not None and member.role in MANAGE_ROLES
    is_creator = str(ref.created_by) == str(user.id)

    if not (is_admin_or_owner or is_pm_or_tl or is_creator):
        raise Forbidden("You do not have permission to delete this Git reference.")

    db.delete(ref)
    db.commit()
    logger.info("Deleted Git reference %s from project %s", reference_id, project_id)


# --- GitHub Connection & REST Integration ---

def parse_repo_owner_name(repo_url: str) -> tuple[str, str]:
    match = GITHUB_REPO_REGEX.match(repo_url.strip())
    if not match:
        raise BaseBusinessException("Registered repository URL is invalid or malformed.", status_code=400)
    owner, repo_name = match.group(1), match.group(2)
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]
    return owner, repo_name


def get_github_connection(db: Session, project_id: UUID, user: User) -> ProjectGitConnection | None:
    verify_project_access(db, project_id, user)
    return db.execute(
        select(ProjectGitConnection).filter(ProjectGitConnection.project_id == project_id)
    ).scalar_one_or_none()


def connect_github_pat(
    db: Session,
    project_id: UUID,
    user: User,
    data: GitHubConnectRequest,
) -> ProjectGitConnection:
    verify_project_access(db, project_id, user, require_manage=True)

    plain_token = data.personal_access_token.strip()

    # 1. Validate token with GitHub /user
    user_info = github_client.validate_pat_and_get_user(plain_token)

    # 2. If a repository is registered for this project, verify access
    repo = db.execute(
        select(ProjectGitRepository).filter(ProjectGitRepository.project_id == project_id)
    ).scalar_one_or_none()

    if repo:
        owner, repo_name = parse_repo_owner_name(repo.repository_url)
        github_client.verify_repo_access(plain_token, owner, repo_name)

    # 3. Encrypt PAT
    encrypted = crypto.encrypt_secret(plain_token)

    token_type = "fine-grained" if plain_token.startswith("github_pat_") else "classic"

    # 4. Upsert connection
    conn = db.execute(
        select(ProjectGitConnection).filter(ProjectGitConnection.project_id == project_id)
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if not conn:
        conn = ProjectGitConnection(
            project_id=project_id,
            encrypted_pat=encrypted,
            github_username=user_info["username"],
            github_user_id=user_info["user_id"],
            github_avatar_url=user_info["avatar_url"],
            token_type=token_type,
            is_valid=True,
            last_tested_at=now,
            connected_by=user.id,
        )
        db.add(conn)
    else:
        conn.encrypted_pat = encrypted
        conn.github_username = user_info["username"]
        conn.github_user_id = user_info["user_id"]
        conn.github_avatar_url = user_info["avatar_url"]
        conn.token_type = token_type
        conn.is_valid = True
        conn.last_tested_at = now
        conn.connected_by = user.id

    db.commit()
    db.refresh(conn)
    logger.info("Securely connected GitHub PAT for project %s (account: %s) by user %s", project_id, conn.github_username, user.id)
    return conn


def test_github_connection(db: Session, project_id: UUID, user: User) -> dict:
    verify_project_access(db, project_id, user, require_manage=True)

    conn = db.execute(
        select(ProjectGitConnection).filter(ProjectGitConnection.project_id == project_id)
    ).scalar_one_or_none()

    if not conn:
        raise ResourceNotFound("No GitHub connection found for this project.")

    plain_token = crypto.decrypt_secret(conn.encrypted_pat)

    try:
        user_info = github_client.validate_pat_and_get_user(plain_token)

        repo = db.execute(
            select(ProjectGitRepository).filter(ProjectGitRepository.project_id == project_id)
        ).scalar_one_or_none()

        repo_info = None
        if repo:
            owner, repo_name = parse_repo_owner_name(repo.repository_url)
            repo_info = github_client.verify_repo_access(plain_token, owner, repo_name)

        conn.is_valid = True
        conn.last_tested_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "is_valid": True,
            "github_username": user_info["username"],
            "github_avatar_url": user_info["avatar_url"],
            "repository_verified": repo_info is not None,
            "message": "GitHub connection verified successfully.",
        }
    except Exception as exc:
        conn.is_valid = False
        conn.last_tested_at = datetime.now(timezone.utc)
        db.commit()
        raise exc


def disconnect_github(db: Session, project_id: UUID, user: User) -> None:
    verify_project_access(db, project_id, user, require_manage=True)

    conn = db.execute(
        select(ProjectGitConnection).filter(ProjectGitConnection.project_id == project_id)
    ).scalar_one_or_none()

    if not conn:
        raise ResourceNotFound("No GitHub connection found for this project.")

    db.delete(conn)
    db.commit()
    logger.info("Disconnected GitHub PAT for project %s by user %s (Task links preserved)", project_id, user.id)


def _get_active_token_and_repo(db: Session, project_id: UUID, user: User) -> tuple[str, str, str]:
    verify_project_access(db, project_id, user)

    conn = db.execute(
        select(ProjectGitConnection).filter(ProjectGitConnection.project_id == project_id)
    ).scalar_one_or_none()

    if not conn or not conn.is_valid:
        raise BaseBusinessException("GitHub is not connected or the token is invalid. Please connect a GitHub PAT first.", status_code=400)

    repo = db.execute(
        select(ProjectGitRepository).filter(ProjectGitRepository.project_id == project_id)
    ).scalar_one_or_none()

    if not repo:
        raise BaseBusinessException("No primary GitHub repository registered for this project.", status_code=400)

    plain_token = crypto.decrypt_secret(conn.encrypted_pat)
    owner, repo_name = parse_repo_owner_name(repo.repository_url)
    return plain_token, owner, repo_name


def fetch_project_github_commits(
    db: Session,
    project_id: UUID,
    user: User,
    per_page: int = 20,
    page: int = 1,
) -> list[dict]:
    plain_token, owner, repo_name = _get_active_token_and_repo(db, project_id, user)
    return github_client.fetch_repo_commits(plain_token, owner, repo_name, per_page=per_page, page=page)


def fetch_project_github_pull_requests(
    db: Session,
    project_id: UUID,
    user: User,
    state: str = "all",
    per_page: int = 20,
    page: int = 1,
) -> list[dict]:
    plain_token, owner, repo_name = _get_active_token_and_repo(db, project_id, user)
    return github_client.fetch_repo_pull_requests(plain_token, owner, repo_name, state=state, per_page=per_page, page=page)
