from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.tasks.schemas import (
    CreateTaskRequest,
    UpdateTaskRequest,
    UpdateTaskStatusRequest,
    ReorderBacklogRequest,
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
    workstream: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.list_tasks(project_id, current_user, sprint_id, workstream)
    return success_response(message="Tasks retrieved successfully.", data=result)


@router.get(
    "/projects/{project_id}/backlog",
    response_model=APIResponse[TaskListResponse],
    status_code=status.HTTP_200_OK,
    summary="List unassigned backlog tasks for a project",
    description="Returns project tasks with no sprint assigned, ordered by position ASC.",
)
def get_backlog(
    project_id: UUID,
    workstream: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.get_backlog(project_id, current_user, workstream)
    return success_response(message="Backlog tasks retrieved successfully.", data=result)


@router.post(
    "/projects/{project_id}/backlog/reorder",
    response_model=APIResponse[TaskListResponse],
    status_code=status.HTTP_200_OK,
    summary="Reorder backlog items for a project",
    description="Updates task positions sequentially using an ordered array of task IDs. Requires PM/TL/Admin.",
)
def reorder_backlog(
    project_id: UUID,
    data: ReorderBacklogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    result = service.reorder_backlog(project_id, data.task_ids, current_user)
    return success_response(message="Backlog reordered successfully.", data=result)


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


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a task by ID",
)
def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskService(db)
    service.delete_task(task_id, current_user)
    return success_response(message="Task deleted successfully.", data=None)
