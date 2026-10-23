import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.conversation import Conversation, ConversationMember, Message
from app.models.enums import CompanyRole, ProjectRole, ConversationType
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def messaging_setup(db_session: Session):
    """Sets up a complete company context with CTO, PM, 2 Developers, and a separate project."""
    company = create_company(db_session, name=f"MsgCo-{uuid.uuid4().hex[:6]}")

    # 1. CTO / Owner
    cto = create_user(
        db_session,
        company,
        email=f"cto_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.OWNER,
    )
    cto.designation = "Chief Technology Officer"

    # 2. Project Manager
    pm = create_user(
        db_session,
        company,
        email=f"pm_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )
    pm.designation = "Lead Project Manager"

    # 3. Developer 1
    dev1 = create_user(
        db_session,
        company,
        email=f"dev1_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )
    dev1.designation = "Senior Backend Engineer"

    # 4. Developer 2
    dev2 = create_user(
        db_session,
        company,
        email=f"dev2_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )
    dev2.designation = "Frontend Engineer"

    # 5. Non-project employee in same company
    outsider = create_user(
        db_session,
        company,
        email=f"outsider_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )
    outsider.designation = "Sales Representative"


    # 6. Primary Project
    project = create_project(db_session, company, name="Alpha Project")

    # Add memberships
    db_session.add(ProjectMember(project_id=project.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER))
    db_session.add(ProjectMember(project_id=project.id, user_id=dev1.id, role=ProjectRole.DEVELOPER))
    db_session.add(ProjectMember(project_id=project.id, user_id=dev2.id, role=ProjectRole.DEVELOPER))

    # 7. Secondary Project (Dev1 is NOT a member)
    project_beta = create_project(db_session, company, name="Beta Project")
    db_session.add(ProjectMember(project_id=project_beta.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER))
    db_session.add(ProjectMember(project_id=project_beta.id, user_id=dev2.id, role=ProjectRole.DEVELOPER))

    db_session.commit()

    return {
        "company": company,
        "cto": cto,
        "pm": pm,
        "dev1": dev1,
        "dev2": dev2,
        "outsider": outsider,
        "project": project,
        "project_beta": project_beta,
    }


def test_developer_to_developer_messaging(client: TestClient, messaging_setup):
    """Developer 1 initiates a direct conversation with Developer 2 and sends messages."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)
    dev2_headers = get_auth_headers(data["dev2"].id)

    # 1. Dev1 creates/gets direct conversation with Dev2
    res_init = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev2"].id)},
        headers=dev1_headers,
    )
    assert res_init.status_code == 200
    conv_id = res_init.json()["data"]["id"]

    # 2. Dev1 sends a message
    res_msg = client.post(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        json={"content": "Hey Dev2, have you pushed the API changes?"},
        headers=dev1_headers,
    )
    assert res_msg.status_code == 201
    msg_data = res_msg.json()["data"]
    assert msg_data["content"] == "Hey Dev2, have you pushed the API changes?"
    assert msg_data["sender_id"] == str(data["dev1"].id)

    # 3. Dev2 retrieves messages in that conversation
    res_get = client.get(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        headers=dev2_headers,
    )
    assert res_get.status_code == 200
    messages = res_get.json()["data"]["messages"]
    assert len(messages) == 1
    assert messages[0]["content"] == "Hey Dev2, have you pushed the API changes?"

    # 4. Dev2 replies
    res_reply = client.post(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        json={"content": "Yes, just merged to staging branch!"},
        headers=dev2_headers,
    )
    assert res_reply.status_code == 201

    # Verify both messages are in order
    res_all = client.get(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        headers=dev1_headers,
    )
    assert res_all.json()["data"]["total"] == 2


def test_project_manager_sends_message_to_developer(client: TestClient, messaging_setup):
    """Project manager starts a direct conversation with Developer 1 and sends a task update."""
    data = messaging_setup
    project_id = str(data["project"].id)
    pm_headers = get_auth_headers(data["pm"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)

    # PM starts direct chat with Dev1
    res_init = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev1"].id)},
        headers=pm_headers,
    )
    assert res_init.status_code == 200
    conv_id = res_init.json()["data"]["id"]

    # PM posts a message
    res_send = client.post(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        json={"content": "Please review the sprint backlog before standup."},
        headers=pm_headers,
    )
    assert res_send.status_code == 201

    # Dev1 reads the message
    res_read = client.get(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        headers=dev1_headers,
    )
    assert res_read.status_code == 200
    assert res_read.json()["data"]["messages"][0]["content"] == "Please review the sprint backlog before standup."


def test_developer_sends_message_to_project_group(client: TestClient, messaging_setup):
    """Developer 1 opens canonical project group and posts a group message."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)
    dev2_headers = get_auth_headers(data["dev2"].id)

    # 1. Dev1 fetches canonical group
    res_group = client.get(
        f"/projects/{project_id}/chat/group",
        headers=dev1_headers,
    )
    assert res_group.status_code == 200
    group_id = res_group.json()["data"]["id"]
    assert res_group.json()["data"]["conversation_type"] == "PROJECT_GROUP"

    # 2. Dev1 posts to group
    res_post = client.post(
        f"/projects/{project_id}/chat/conversations/{group_id}/messages",
        json={"content": "Team, deployment to staging was successful."},
        headers=dev1_headers,
    )
    assert res_post.status_code == 201

    # 3. Dev2 sees the group message
    res_dev2_msgs = client.get(
        f"/projects/{project_id}/chat/conversations/{group_id}/messages",
        headers=dev2_headers,
    )
    assert res_dev2_msgs.status_code == 200
    assert res_dev2_msgs.json()["data"]["messages"][0]["content"] == "Team, deployment to staging was successful."


def test_cto_can_initiate_conversation_with_pm(client: TestClient, messaging_setup):
    """CTO can view PM as eligible contact and initiate direct messaging with PM."""
    data = messaging_setup
    project_id = str(data["project"].id)
    cto_headers = get_auth_headers(data["cto"].id)
    pm_headers = get_auth_headers(data["pm"].id)

    # 1. CTO eligible participants only lists PM
    res_part = client.get(
        f"/projects/{project_id}/chat/participants",
        headers=cto_headers,
    )
    assert res_part.status_code == 200
    participants = res_part.json()["data"]
    assert len(participants) == 1
    assert participants[0]["id"] == str(data["pm"].id)
    assert participants[0]["project_role"] == "PROJECT_MANAGER"

    # 2. CTO initiates direct conversation with PM
    res_init = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["pm"].id)},
        headers=cto_headers,
    )
    assert res_init.status_code == 200
    conv_id = res_init.json()["data"]["id"]

    # 3. CTO sends message
    res_msg = client.post(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        json={"content": "What is the expected release date for Q4 milestones?"},
        headers=cto_headers,
    )
    assert res_msg.status_code == 201

    # 4. PM receives and responds
    res_pm_msg = client.get(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        headers=pm_headers,
    )
    assert res_pm_msg.status_code == 200
    assert len(res_pm_msg.json()["data"]["messages"]) == 1


def test_cto_cannot_access_project_group_chat(client: TestClient, messaging_setup):
    """CTO is strictly forbidden from accessing or posting to project group chat."""
    data = messaging_setup
    project_id = str(data["project"].id)
    cto_headers = get_auth_headers(data["cto"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)

    # 1. Dev1 creates group chat
    res_group = client.get(f"/projects/{project_id}/chat/group", headers=dev1_headers)
    group_id = res_group.json()["data"]["id"]

    # 2. CTO attempts to get canonical group -> 403 Forbidden
    res_cto_group = client.get(f"/projects/{project_id}/chat/group", headers=cto_headers)
    assert res_cto_group.status_code == 403
    assert "CTOs are not permitted" in res_cto_group.json()["message"]

    # 3. CTO attempts to read group messages -> 403 Forbidden
    res_cto_read = client.get(
        f"/projects/{project_id}/chat/conversations/{group_id}/messages",
        headers=cto_headers,
    )
    assert res_cto_read.status_code == 403

    # 4. CTO attempts to post message to group -> 403 Forbidden
    res_cto_post = client.post(
        f"/projects/{project_id}/chat/conversations/{group_id}/messages",
        json={"content": "Hello team"},
        headers=cto_headers,
    )
    assert res_cto_post.status_code == 403


def test_cto_cannot_initiate_conversation_with_developer(client: TestClient, messaging_setup):
    """CTO cannot initiate direct conversation with developer."""
    data = messaging_setup
    project_id = str(data["project"].id)
    cto_headers = get_auth_headers(data["cto"].id)

    res = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev1"].id)},
        headers=cto_headers,
    )
    assert res.status_code == 403
    assert "CTOs are only authorized to message the Project Manager" in res.json()["message"]


def test_developer_cannot_initiate_conversation_with_cto(client: TestClient, messaging_setup):
    """Developer cannot initiate direct conversation with CTO."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)

    res = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["cto"].id)},
        headers=dev1_headers,
    )
    assert res.status_code == 403
    assert "Developers cannot directly message the CTO" in res.json()["message"]


def test_developer_cannot_read_another_project_messages(client: TestClient, messaging_setup):
    """Developer 1 cannot access conversations or messages in Project Beta where they are not a member."""
    data = messaging_setup
    beta_id = str(data["project_beta"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)
    pm_headers = get_auth_headers(data["pm"].id)

    # PM creates group in Beta
    res_beta_group = client.get(f"/projects/{beta_id}/chat/group", headers=pm_headers)
    beta_group_id = res_beta_group.json()["data"]["id"]

    # Dev 1 attempts to access Beta group
    res_dev1_access = client.get(
        f"/projects/{beta_id}/chat/conversations/{beta_group_id}/messages",
        headers=dev1_headers,
    )
    assert res_dev1_access.status_code == 403


def test_unauthorized_user_cannot_send_messages(client: TestClient, messaging_setup):
    """Non-project member employee cannot send messages to project chat."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)
    outsider_headers = get_auth_headers(data["outsider"].id)

    # Dev1 creates direct chat with Dev2
    res_direct = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev2"].id)},
        headers=dev1_headers,
    )
    conv_id = res_direct.json()["data"]["id"]

    # Outsider tries to post to this conversation -> 403 Forbidden
    res_post = client.post(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        json={"content": "Intruder message"},
        headers=outsider_headers,
    )
    assert res_post.status_code == 403


def test_repeated_requests_idempotency(client: TestClient, messaging_setup):
    """Repeated calls to get group or direct chat do not create duplicate conversations."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)

    # 1. Group idempotency
    res1 = client.get(f"/projects/{project_id}/chat/group", headers=dev1_headers)
    res2 = client.get(f"/projects/{project_id}/chat/group", headers=dev1_headers)
    assert res1.json()["data"]["id"] == res2.json()["data"]["id"]

    # 2. Direct chat idempotency
    res_dir1 = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev2"].id)},
        headers=dev1_headers,
    )
    res_dir2 = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev2"].id)},
        headers=dev1_headers,
    )
    assert res_dir1.json()["data"]["id"] == res_dir2.json()["data"]["id"]


def test_invalid_message_content_rejected(client: TestClient, messaging_setup):
    """Empty or whitespace-only messages and messages exceeding length limit are rejected."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)

    res_group = client.get(f"/projects/{project_id}/chat/group", headers=dev1_headers)
    group_id = res_group.json()["data"]["id"]

    # Empty string
    res_empty = client.post(
        f"/projects/{project_id}/chat/conversations/{group_id}/messages",
        json={"content": ""},
        headers=dev1_headers,
    )
    assert res_empty.status_code in (400, 422)

    # Whitespace only
    res_ws = client.post(
        f"/projects/{project_id}/chat/conversations/{group_id}/messages",
        json={"content": "    \n\t  "},
        headers=dev1_headers,
    )
    assert res_ws.status_code in (400, 422)

    # Too long (> 5000 chars)
    res_long = client.post(
        f"/projects/{project_id}/chat/conversations/{group_id}/messages",
        json={"content": "A" * 5001},
        headers=dev1_headers,
    )
    assert res_long.status_code in (400, 422)


def test_pm_cannot_read_private_dev_to_dev_chat(client: TestClient, messaging_setup):
    """The project manager must not automatically gain access to private conversations between two developers."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)
    pm_headers = get_auth_headers(data["pm"].id)

    # Dev1 starts private chat with Dev2
    res_init = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev2"].id)},
        headers=dev1_headers,
    )
    assert res_init.status_code == 200
    conv_id = res_init.json()["data"]["id"]

    # Dev1 sends a private message
    client.post(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        json={"content": "Confidential peer discussion"},
        headers=dev1_headers,
    )

    # PM attempts to read messages in Dev1-Dev2 private chat -> 403 Forbidden
    res_pm_read = client.get(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
        headers=pm_headers,
    )
    assert res_pm_read.status_code == 403
    assert "not an authorized participant" in res_pm_read.json()["message"]


def test_message_pagination(client: TestClient, messaging_setup):
    """Message history paginates correctly with limit and offset."""
    data = messaging_setup
    project_id = str(data["project"].id)
    dev1_headers = get_auth_headers(data["dev1"].id)

    # Use a direct chat between dev1 and dev2
    res_dir = client.post(
        f"/projects/{project_id}/chat/direct",
        json={"recipient_id": str(data["dev2"].id)},
        headers=dev1_headers,
    )
    conv_id = res_dir.json()["data"]["id"]

    # Send 4 new tagged messages
    sent_contents = [f"Pagination-Tag-{i}-{uuid.uuid4().hex[:4]}" for i in range(4)]
    for content in sent_contents:
        client.post(
            f"/projects/{project_id}/chat/conversations/{conv_id}/messages",
            json={"content": content},
            headers=dev1_headers,
        )

    # Page 1: limit 2
    res_p1 = client.get(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages?limit=2&offset=0",
        headers=dev1_headers,
    )
    assert res_p1.status_code == 200
    p1_data = res_p1.json()["data"]
    assert len(p1_data["messages"]) == 2

    # Page 2: limit 2, offset 2
    res_p2 = client.get(
        f"/projects/{project_id}/chat/conversations/{conv_id}/messages?limit=2&offset=2",
        headers=dev1_headers,
    )
    assert res_p2.status_code == 200
    p2_data = res_p2.json()["data"]
    assert len(p2_data["messages"]) == 2
    # Ensure items on page 1 and page 2 are distinct
    p1_ids = {m["id"] for m in p1_data["messages"]}
    p2_ids = {m["id"] for m in p2_data["messages"]}
    assert p1_ids.isdisjoint(p2_ids)


