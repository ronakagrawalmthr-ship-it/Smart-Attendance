import pytest
import json
from starlette.websockets import WebSocketDisconnect
from models import User, RoleEnum, AcademicSession, StudentProfile, DevicePushToken
from security import get_password_hash, create_access_token

def test_push_token_registration_and_unregister(client, db_session):
    # 1. Create authenticated teacher user
    user = User(
        email="push_user@campus.edu",
        hashed_password=get_password_hash("ValidPass123!"),
        role=RoleEnum.teacher,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token({"sub": user.email, "role": user.role.value, "id": user.id})

    # 2. Register push token
    res = client.post(
        "/notifications/push-token",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "token": "ExponentPushToken[test_token_abc_123]",
            "platform": "expo",
            "device_name": "Faculty iPhone"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["token"] == "ExponentPushToken[test_token_abc_123]"

    # 3. Verify record was stored in database
    db_token = db_session.query(DevicePushToken).filter(
        DevicePushToken.token == "ExponentPushToken[test_token_abc_123]"
    ).first()
    assert db_token is not None
    assert db_token.user_id == user.id

    # 4. Test self push dispatch endpoint
    test_res = client.post(
        "/notifications/test-push",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Test Title", "body": "Test Body"}
    )
    assert test_res.status_code == 200
    assert test_res.json()["success"] is True

    # 5. Unregister push token
    del_res = client.request(
        "DELETE",
        "/notifications/push-token",
        params={"token": "ExponentPushToken[test_token_abc_123]"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_websocket_session_roster_stream(client, db_session):
    # Create test session
    session_rec = AcademicSession(
        branch="Computer Science & Engineering",
        semester=6,
        section="A",
        conducted_by_name="Prof. Live Stream",
        custom_subject_name="Distributed Systems"
    )
    db_session.add(session_rec)
    db_session.commit()

    # 1. Reject unauthenticated WebSocket connection without token
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/ws/session/{session_rec.id}"):
            pass
    assert exc_info.value.code == 1008

    # 2. Connect with valid authentication token
    auth_token = create_access_token({"sub": "ws_prof@campus.edu", "role": "teacher"})
    with client.websocket_connect(f"/ws/session/{session_rec.id}?token={auth_token}") as websocket:
        # Receive initial roster state
        raw_msg = websocket.receive_text()
        msg = json.loads(raw_msg)
        assert msg["type"] == "INIT_ROSTER_STATE"
        assert msg["session_id"] == session_rec.id
        assert msg["data"]["conductor"] == "Prof. Live Stream"
        assert msg["data"]["subject"] == "Distributed Systems"
        assert "present_count" in msg["data"]

        websocket.send_text(json.dumps({"type": "PING"}))
        pong_raw = websocket.receive_text()
        pong = json.loads(pong_raw)
        assert pong["type"] == "PONG"

        # Graceful disconnect
        websocket.send_text(json.dumps({"type": "DISCONNECT"}))
