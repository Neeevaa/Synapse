import pytest
from fastapi import Depends, APIRouter, status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole
from app.models.user import User
from app.permissions.dependencies import require_super_admin
from app.core.security import create_access_token
from app.common.responses import APIResponse, success_response
from tests.conftest import create_company, create_user

# Test router to verify require_super_admin dependency
test_router = APIRouter()


@test_router.get(
    "/test-super-admin-endpoint",
    response_model=APIResponse[dict],
    status_code=status.HTTP_200_OK,
)
def super_admin_only_endpoint(current_user: User = Depends(require_super_admin())):
    return success_response(
        message="Super Admin access granted.",
        data={"user_id": str(current_user.id), "is_super_admin": current_user.is_super_admin},
    )


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_super_admin_permission_dependency(client: TestClient, db_session: Session):
    # Mount test router on client app
    client.app.include_router(test_router)

    company = create_company(db_session, name="SuperAdmin Test Co")

    # 1. Company Owner (non-super-admin)
    owner = create_user(db_session, company, email="owner@testsuper.com", role=CompanyRole.OWNER)
    assert owner.is_super_admin is False

    headers_owner = get_auth_headers(owner.id)
    res_owner = client.get("/test-super-admin-endpoint", headers=headers_owner)
    assert res_owner.status_code == 403, res_owner.text
    assert "Only platform Super Admins can access" in res_owner.json()["message"]

    # 2. Regular User (non-super-admin)
    reg_user = create_user(db_session, company, email="dev@testsuper.com", role=None)
    assert reg_user.is_super_admin is False

    headers_dev = get_auth_headers(reg_user.id)
    res_dev = client.get("/test-super-admin-endpoint", headers=headers_dev)
    assert res_dev.status_code == 403, res_dev.text

    # 3. Super Admin User (is_super_admin = True, company_id = None)
    super_admin = User(
        email="real_superadmin@testsuper.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        role=None,
        is_super_admin=True,
        is_verified=True,
        is_active=True,
        profile_completed=True,
    )
    db_session.add(super_admin)
    db_session.commit()

    headers_super = get_auth_headers(super_admin.id)
    res_super = client.get("/test-super-admin-endpoint", headers=headers_super)
    assert res_super.status_code == 200, res_super.text
    body = res_super.json()
    assert body["data"]["is_super_admin"] is True
    assert body["data"]["user_id"] == str(super_admin.id)
