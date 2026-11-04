from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import json
import asyncio

try:
    from .. import models, database, security
    from ..services.websocket_manager import ws_manager
except (ImportError, ValueError):
    import models, database, security
    from services.websocket_manager import ws_manager

router = APIRouter(
    tags=["Real-Time WebSockets"]
)

@router.websocket("/ws/session/{session_id}")
async def websocket_session_roster_endpoint(
    session_id: int,
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    """
    Real-Time WebSocket stream for classroom attendance sessions.
    - Verified authentication via JWT query param or Authorization header.
    - Streams student check-ins as they happen (QR scan, face match, or manual adjustment).
    - Pre-loads initial snapshot with eager joinedload to eliminate N+1 queries.
    - Accurately filters total expected students by branch, semester, and section.
    """
    auth_token = token
    if not auth_token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ")[1]

    # Mandatory WebSocket authentication FIRST
    if not auth_token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = security.decode_access_token(auth_token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify session existence
    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if not session:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect_session(session_id, websocket)
    
    # Send initial snapshot of session state
    try:
        logs = db.query(models.AttendanceLog).options(
            joinedload(models.AttendanceLog.student)
        ).filter(
            models.AttendanceLog.session_id == session_id,
            models.AttendanceLog.is_present == True
        ).all()

        checked_in = []
        for log in logs:
            student = log.student
            if student:
                checked_in.append({
                    "student_id": student.id,
                    "roll_number": student.roll_number,
                    "name": student.full_name,
                    "status_tag": log.status_tag or "PRESENT",
                    "confidence": log.confidence_score,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None
                })

        # Precise query matching branch, semester, and section
        total_students_q = db.query(models.StudentProfile).filter(
            models.StudentProfile.branch == session.branch
        )
        if session.semester:
            total_students_q = total_students_q.filter(models.StudentProfile.semester == session.semester)
        if session.section:
            total_students_q = total_students_q.filter(
                (models.StudentProfile.section == session.section) | (models.StudentProfile.section == None)
            )
        if session.sub_batch and session.sub_batch.strip() and session.sub_batch.lower() != "all":
            total_students_q = total_students_q.filter(models.StudentProfile.sub_batch.ilike(session.sub_batch.strip()))
        total_students = total_students_q.count()

        init_payload = {
            "type": "INIT_ROSTER_STATE",
            "session_id": session_id,
            "data": {
                "session_id": session.id,
                "branch": session.branch,
                "semester": session.semester,
                "section": session.section,
                "conductor": session.conducted_by_name or "Faculty In-Charge",
                "subject": session.custom_subject_name or (session.subject.name if session.subject else "Lecture Session"),
                "present_count": len(checked_in),
                "total_expected": total_students,
                "students": checked_in
            }
        }
        await websocket.send_text(json.dumps(init_payload))
    except Exception as e:
        print(f"[WS INIT NOTE] Could not construct initial snapshot: {e}")

    # Keep connection open and respond to heartbeats
    try:
        while True:
            raw_msg = await websocket.receive_text()
            if not raw_msg:
                break
            try:
                msg_data = json.loads(raw_msg)
                if msg_data.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
                elif msg_data.get("type") == "DISCONNECT":
                    break
            except Exception:
                pass
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect_session(session_id, websocket)
