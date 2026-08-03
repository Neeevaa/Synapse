import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.logging import setup_logging
from app.events import setup_event_handlers
from app.common.exceptions import BaseBusinessException
from app.common.responses import error_response
from app.auth.router import router as auth_router
from app.projects.router import router as projects_router
from app.project_members.router import router as project_members_router
from app.sprints.router import router as sprints_router
from app.tasks.router import router as tasks_router
from app.task_comments.router import router as task_comments_router
from app.ai_jobs.router import router as ai_jobs_router

# 1. Initialize Structured Logging
setup_logging()
logger = logging.getLogger("app")

# 2. Setup Event Bus Handlers
setup_event_handlers()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Project Management Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Register Exception Handlers
@app.exception_handler(BaseBusinessException)
async def business_exception_handler(request: Request, exc: BaseBusinessException):
    """
    Catches custom business exceptions and formats them as standard error envelopes.
    """
    errors = getattr(exc, "errors", [])
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(message=exc.message, errors=errors),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Catches validation errors and translates them into the standard error format.
    """
    errors = []
    for err in exc.errors():
        loc = err.get("loc", [])
        field = (
            ".".join(str(x) for x in loc[1:])
            if len(loc) > 1
            else (loc[0] if loc else "unknown")
        )
        errors.append({"field": field, "message": err.get("msg", "Invalid value")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response(message="Validation failed.", errors=errors),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler for unexpected infrastructure or runtime failures.
    Logs trace details and returns a standardized 500 error.
    """
    logger.exception(f"Unhandled exception occurred: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response(message="Internal server error."),
    )


# 4. Include Domain Routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(projects_router, prefix="/projects", tags=["Projects"])
app.include_router(project_members_router, prefix="/projects", tags=["Project Members"])
app.include_router(sprints_router, prefix="/projects", tags=["Sprints"])
app.include_router(tasks_router, prefix="", tags=["Tasks"])
app.include_router(task_comments_router, prefix="", tags=["Task Comments"])
app.include_router(ai_jobs_router, prefix="", tags=["AI Jobs"])


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "database": "configuration loaded",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}