"""
Test configuration and fixtures for Synapse backend integration tests.
Uses an in-memory SQLite database to keep tests fast and isolated.
"""
import pytest
from uuid import uuid4
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.main import app
from app.db.session import get_db
from app.models.base import Base
from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.pending_membership import PendingMembership
from app.models.enums import CompanyRole, ProjectRole, SubscriptionPlan

# ---------------------------------------------------------------------------
# SQLite in-memory engine for tests.
# StaticPool ensures all connections share the same underlying database,
# which is critical because SQLite in-memory DBs are per-connection.
# ---------------------------------------------------------------------------
SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# SQLite does not enforce foreign keys by default — enable them.
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def setup_database():
    """
    Create all tables before each test and drop them afterwards.
    Ensures every test starts with a clean slate.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session() -> Session:
    """Provide a transactional test database session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    """
    FastAPI TestClient with the DB dependency overridden
    to use the test SQLite session.
    """
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Factory helpers
# ---------------------------------------------------------------------------


def create_company(
    db: Session,
    *,
    name: str = "Test Company",
    slug: str | None = None,
) -> Company:
    """Insert a Company row and return it."""
    company = Company(
        id=uuid4(),
        name=name,
        slug=slug or name.lower().replace(" ", "-"),
        subscription_plan=SubscriptionPlan.FREE,
        is_active=True,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def create_user(
    db: Session,
    company: Company,
    *,
    email: str = "user@example.com",
    first_name: str = "Test",
    last_name: str = "User",
    password_hash: str | None = "hashed_password",
    oauth_provider: str | None = None,
    oauth_id: str | None = None,
    role: CompanyRole = CompanyRole.ADMIN,
    is_verified: bool = True,
) -> User:
    """Insert a User row and return it."""
    user = User(
        id=uuid4(),
        company_id=company.id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=password_hash,
        oauth_provider=oauth_provider,
        oauth_id=oauth_id,
        role=role,
        is_active=True,
        is_verified=is_verified,
        profile_completed=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_project(
    db: Session,
    company: Company,
    *,
    name: str = "Test Project",
) -> Project:
    """Insert a Project row and return it."""
    project = Project(
        id=uuid4(),
        company_id=company.id,
        name=name,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def create_pending_membership(
    db: Session,
    project: Project,
    inviter: User,
    *,
    email: str,
    role: ProjectRole = ProjectRole.DEVELOPER,
) -> PendingMembership:
    """Insert a PendingMembership row and return it."""
    pm = PendingMembership(
        id=uuid4(),
        project_id=project.id,
        email=email,
        role=role,
        invited_by=inviter.id,
    )
    db.add(pm)
    db.commit()
    db.refresh(pm)
    return pm
