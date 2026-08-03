from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.tasks.schemas import (
    CreateTaskRequest,
    UpdateTaskRequest,
    UpdateTaskStatusRequest,
    TaskResponse,
    TaskListResponse,
)
from app.tasks.service import TaskService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/projects/{project_id}/tasks",
    response_model=APIResponse[TaskListResponse],
    status_code=status.HTTP_200_OK,
    summary="List tasks for a project",
)
def list_tasks(
    project_id: UUID,
    sprint_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.list_tasks(project_id, current_user, sprint_id)
    return success_response(message="Tasks retrieved successfully.", data=result)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=APIResponse[TaskResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a task in a project",
)
def create_task(
    project_id: UUID,
    data: CreateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.create_task(project_id, data, current_user)
    return success_response(message="Task created successfully.", data=result)


@router.get(
    "/tasks/{task_id}",
    response_model=APIResponse[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="Get a single task by ID",
)
def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.get_task(task_id, current_user)
    return success_response(message="Task retrieved successfully.", data=result)


@router.put(
    "/tasks/{task_id}",
    response_model=APIResponse[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="Update task fields (title, description, status, priority, assignee)",
)
def update_task(
    task_id: UUID,
    data: UpdateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.update_task(task_id, data, current_user)
    return success_response(message="Task updated successfully.", data=result)


@router.patch(
    "/tasks/{task_id}/status",
    response_model=APIResponse[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="Update task status only",
)
def update_task_status(
    task_id: UUID,
    data: UpdateTaskStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.update_task_status(task_id, data, current_user)
    return success_response(message="Task status updated successfully.", data=result)
