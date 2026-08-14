import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement, RequirementVersion
from app.models.meeting import Meeting
from app.models.enums import CompanyRole, ProjectRole, RequirementType, RequirementStatus, MeetingType, MeetingStatus
from app.knowledge.provider import ConfigurationError, BaseEmbeddingProvider, MockEmbeddingProvider
from app.core.config import settings
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


class MismatchedDimensionProvider(BaseEmbeddingProvider):
    def get_model_name(self) -> str:
        return "mismatched-test-provider"

    def get_dimension(self) -> int:
        return 768  # Mismatched dimension (expected 1536)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [[0.1] * 768 for _ in texts]


def test_embedding_dimension_validation_error():
    provider = MismatchedDimensionProvider()
    with pytest.raises(ConfigurationError) as exc_info:
        provider.validate_dimension([[0.1] * 768])

    assert "mismatch" in str(exc_info.value)


def test_index_project_artifacts_and_content_hash(client: TestClient, db_session: Session):
    co = create_company(db_session, name="KB Co")
    pm = create_user(db_session, co, email="pm_kb@kb.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="KB Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    # Create Requirement
    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-201",
        title="OAuth2 Security Spec",
        description="System shall enforce OAuth2 access token validation on all API endpoints.",
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    headers = get_auth_headers(pm.id)

    # First Indexing Run -> Indexes 1 document
    res1 = client.post(f"/projects/{proj.id}/knowledge/index", headers=headers)
    assert res1.status_code == 200, res1.text
    data1 = res1.json()["data"]
    assert data1["total_documents_indexed"] >= 1
    assert data1["documents_skipped_hash_match"] == 0

    # Second Indexing Run -> Skipped due to content_hash match!
    res2 = client.post(f"/projects/{proj.id}/knowledge/index", headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()["data"]
    assert data2["documents_skipped_hash_match"] >= 1


def test_vector_search_and_telemetry_log(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Search Co")
    pm = create_user(db_session, co, email="pm_search@kb.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Search Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    # Create Requirement & Meeting
    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-301",
        title="JWT Token Expiry Specification",
        description="Access tokens must expire in 15 minutes.",
        created_by=pm.id,
    )
    mtg = Meeting(
        project_id=proj.id,
        company_id=co.id,
        title="Security Review Sync",
        meeting_type=MeetingType.TECHNICAL,
        organizer_id=pm.id,
        scheduled_at=datetime.now(timezone.utc),
        duration_minutes=30,
        summary="Discussed token expiry rules and security limits.",
    )
    db_session.add_all([req, mtg])
    db_session.commit()

    headers = get_auth_headers(pm.id)
    client.post(f"/projects/{proj.id}/knowledge/index", headers=headers)

    # Perform Vector Search
    search_payload = {
        "query": "JWT token expiry and security limits",
        "top_k": 5,
    }
    res_search = client.post(f"/projects/{proj.id}/knowledge/search", json=search_payload, headers=headers)
    assert res_search.status_code == 200, res_search.text
    data_search = res_search.json()["data"]

    assert data_search["total_results"] >= 1
    assert data_search["query_latency_ms"] >= 0.0
    first_result = data_search["results"][0]
    assert "source_type" in first_result
    assert "deep_link_url" in first_result
    assert first_result["similarity_score"] >= 0.0

    # Fetch Telemetry Logs
    res_telem = client.get(f"/projects/{proj.id}/knowledge/telemetry", headers=headers)
    assert res_telem.status_code == 200
    data_telem = res_telem.json()["data"]
    assert len(data_telem) >= 1
    assert data_telem[0]["query"] == "JWT token expiry and security limits"


def test_rag_context_provenance_headers(client: TestClient, db_session: Session):
    co = create_company(db_session, name="RAG Co")
    pm = create_user(db_session, co, email="pm_rag@kb.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="RAG Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-401",
        title="Multi-Factor Authentication",
        description="MFA is required for super admin role logins.",
        current_version=2,
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    client.post(f"/projects/{proj.id}/knowledge/index", headers=headers)

    rag_payload = {
        "query": "Is MFA required for admin logins?",
        "top_k": 3,
    }
    res_rag = client.post(f"/projects/{proj.id}/knowledge/rag-context", json=rag_payload, headers=headers)
    assert res_rag.status_code == 200, res_rag.text
    data_rag = res_rag.json()["data"]

    assert "[SOURCE: REQUIREMENT" in data_rag["formatted_context"]
    assert "REQ-401" in data_rag["formatted_context"]
    assert data_rag["total_tokens"] > 0


def test_cross_company_vector_isolation(client: TestClient, db_session: Session):
    co_a = create_company(db_session, name="Company A Vector")
    co_b = create_company(db_session, name="Company B Vector")

    pm_a = create_user(db_session, co_a, email="pma_viso@coma.com", role=CompanyRole.ADMIN)
    pm_b = create_user(db_session, co_b, email="pmb_viso@comb.com", role=CompanyRole.ADMIN)

    proj_a = create_project(db_session, co_a, name="Project A Vector")
    proj_b = create_project(db_session, co_b, name="Project B Vector")

    pm_mem_a = ProjectMember(project_id=proj_a.id, user_id=pm_a.id, role=ProjectRole.PROJECT_MANAGER)
    pm_mem_b = ProjectMember(project_id=proj_b.id, user_id=pm_b.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add_all([pm_mem_a, pm_mem_b])
    db_session.commit()

    req_a = Requirement(
        project_id=proj_a.id,
        company_id=co_a.id,
        requirement_key="REQ-SECRET",
        title="Company A Top Secret Algorithm",
        description="Confidential proprietary formula.",
        created_by=pm_a.id,
    )
    db_session.add(req_a)
    db_session.commit()

    headers_a = get_auth_headers(pm_a.id)
    headers_b = get_auth_headers(pm_b.id)

    client.post(f"/projects/{proj_a.id}/knowledge/index", headers=headers_a)

    # PM B from Company B attempts to search Project A's knowledge -> 403 Forbidden
    res_cross_search = client.post(
        f"/projects/{proj_a.id}/knowledge/search",
        json={"query": "Top Secret Algorithm"},
        headers=headers_b,
    )
    assert res_cross_search.status_code == 403
