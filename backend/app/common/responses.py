from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str
    data: T | None = None


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: list[ErrorDetail] = Field(default_factory=list)


def success_response(message: str, data: Any = None) -> dict:
    """
    Standard dictionary builder for a successful API response.
    """
    return {"success": True, "message": message, "data": data}


def error_response(message: str, errors: list[dict] | None = None) -> dict:
    """
    Standard dictionary builder for an error API response.
    """
    return {"success": False, "message": message, "errors": errors or []}
