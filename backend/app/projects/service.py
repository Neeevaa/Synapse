import logging
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.user import User
from app.models.enums import ProjectStatus, ProjectRole, CompanyRole
from app.projects.repository import ProjectRepository
from app.projects.schemas import (
    CreateProjectRequest,
    UpdateProjectRequest,
    ProjectResponse,
    ProjectDetailResponse,
    ProjectListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden
from app.permissions.dependencies import check_project_role_or_company_admin

logger = logging.getLogger("app")


class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def list_projects(self, user: User) -> ProjectListResponse:
        """
        Lists projects accessible to the current user (all for OWNER/ADMIN, assigned for ProjectMembers).
        """
        projects = self.repo.get_projects_for_user(user)

        project_responses = []
        for p in projects:
            creator_name = None
            if p.creator:
                creator_name = f"{p.creator.first_name} {p.creator.last_name}"
            project_responses.append(
                ProjectResponse(
                    id=p.id,
                    name=p.name,
                    description=p.description,
                    status=p.status,
                    created_by=p.created_by,
                    creator_name=creator_name,
                    created_at=p.created_at,
                )
            )

        return ProjectListResponse(
            projects=project_responses,
            total=len(project_responses),
        )

    def get_project_detail(self, project_id: UUID, user: User) -> ProjectDetailResponse:
        """
        Gets project detail along with sprint, task, and member counts.
        """
        project = check_project_role_or_company_admin(self.db, user, project_id)

        creator_name = None
        if project.creator:
            creator_name = f"{project.creator.first_name} {project.creator.last_name}"

        # Calculate counts
        sprint_count = self.db.scalar(
            select(func.count(Sprint.id)).filter(Sprint.project_id == project_id)
        ) or 0

        task_count = self.db.scalar(
            select(func.count(Task.id)).filter(Task.project_id == project_id)
        ) or 0

        member_count = self.db.scalar(
            select(func.count(ProjectMember.id)).filter(ProjectMember.project_id == project_id)
        ) or 0

        return ProjectDetailResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            created_by=project.created_by,
            creator_name=creator_name,
            created_at=project.created_at,
            sprint_count=sprint_count,
            task_count=task_count,
            member_count=member_count,
        )

    def create_project(self, data: CreateProjectRequest, user: User) -> ProjectResponse:
        """
        Creates a new project for the user's company and adds creator as Project Member.
        """
        if user.company_id:
            from app.subscriptions.service import EntitlementService
            EntitlementService(self.db).check_project_limit(user.company_id)

        try:
            project = Project(
                company_id=user.company_id,
                name=data.name,
                description=data.description,
                created_by=user.id,
            )
            self.repo.create_project(project)

            # Auto add creator as ProjectMember with PROJECT_MANAGER role
            member = ProjectMember(
                project_id=project.id,
                user_id=user.id,
                role=ProjectRole.PROJECT_MANAGER,
            )
            self.db.add(member)

            self.db.commit()

            logger.info(
                "Project created successfully",
                extra={
                    "extra_info": {
                        "project_id": str(project.id),
                        "company_id": str(user.company_id),
                        "created_by": str(user.id),
                    }
                },
            )

            return ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                status=project.status,
                created_by=project.created_by,
                creator_name=f"{user.first_name} {user.last_name}",
                created_at=project.created_at,
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def update_project(self, project_id: UUID, data: UpdateProjectRequest, user: User) -> ProjectDetailResponse:
        """
        Updates project details.
        """
        project = check_project_role_or_company_admin(
            self.db, user, project_id, [ProjectRole.PROJECT_MANAGER]
        )

        try:
            if data.name is not None:
                project.name = data.name
            if data.description is not None:
                project.description = data.description
            if data.status is not None:
                project.status = ProjectStatus(data.status)

            self.db.commit()
            return self.get_project_detail(project_id, user)
        except Exception as e:
            self.db.rollback()
            raise e

    def delete_project(self, project_id: UUID, user: User) -> None:
        """
        Deletes a project.
        """
        project = self.repo.get_project_by_id(project_id)
        if not project:
            raise ResourceNotFound("Project not found.")

        if str(project.company_id) != str(user.company_id):
            raise Forbidden("You do not have access to this project.")

        try:
            self.repo.delete_project(project)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
