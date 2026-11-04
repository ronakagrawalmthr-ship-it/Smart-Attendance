from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

try:
    from .. import models, database
    from .auth import get_current_user
    from ..services.push_notification_service import notify_user_id, send_expo_push_batch
    from ..time_utils import now_ist_naive, now_ist
except (ImportError, ValueError):
    import models, database
    from routers.auth import get_current_user
    from services.push_notification_service import notify_user_id, send_expo_push_batch
    try:
        from time_utils import now_ist_naive, now_ist
    except (ImportError, ValueError):
        from datetime import timezone, timedelta
        _IST = timezone(timedelta(hours=5, minutes=30))
        def now_ist_naive(): return datetime.now(_IST).replace(tzinfo=None)
        def now_ist(): return datetime.now(_IST)

router = APIRouter(
    prefix="/notifications",
    tags=["Push Notifications & Device Management"]
)

class RegisterTokenRequest(BaseModel):
    token: str
    platform: Optional[str] = "expo"
    device_name: Optional[str] = None

class TestPushRequest(BaseModel):
    title: Optional[str] = "Smart Attendance System"
    body: Optional[str] = "Test push notification from FastAPI backend."

@router.post("/push-token")
def register_device_push_token(
    payload: RegisterTokenRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Registers or updates an Expo push token for the currently authenticated user.
    """
    token_str = payload.token.strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="Push token cannot be empty.")

    existing = db.query(models.DevicePushToken).filter(models.DevicePushToken.token == token_str).first()
    if existing:
        existing.user_id = current_user.id
        existing.platform = payload.platform or "expo"
        existing.device_name = payload.device_name
        existing.updated_at = now_ist_naive()
    else:
        new_token = models.DevicePushToken(
            user_id=current_user.id,
            token=token_str,
            platform=payload.platform or "expo",
            device_name=payload.device_name,
            updated_at=now_ist_naive()
        )
        db.add(new_token)

    db.commit()
    return {
        "success": True,
        "message": "Device push token registered successfully.",
        "token": token_str
    }

@router.delete("/push-token")
def unregister_device_push_token(
    token: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Unregisters a push token (called during logout).
    """
    existing = db.query(models.DevicePushToken).filter(
        models.DevicePushToken.token == token.strip(),
        models.DevicePushToken.user_id == current_user.id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"success": True, "message": "Token removed."}
    return {"success": False, "message": "Token not found."}

@router.post("/test-push")
def send_test_push_to_self(
    payload: TestPushRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Dispatches an immediate test push notification to all registered devices of the logged-in user.
    """
    res = notify_user_id(
        db=db,
        user_id=current_user.id,
        title=payload.title or "Smart Attendance Alert",
        body=payload.body or "Test notification delivered successfully!",
        data={"type": "TEST_ALERT", "timestamp": now_ist().isoformat()}
    )
    if isinstance(res, dict):
        count = res.get("sent_count", 0)
        targeted = res.get("devices_targeted", 0)
        is_success = res.get("success", False)
        error = res.get("error")
    else:
        count = targeted = int(res)
        is_success = True
        error = None

    return {
        "success": is_success,
        "devices_targeted": targeted,
        "sent_count": count,
        "error": error,
        "message": f"Push notification dispatched to {count} device(s)." if is_success else f"Push notification delivery failed: {error}"
    }
