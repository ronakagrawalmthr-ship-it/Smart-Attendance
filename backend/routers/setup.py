from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import secrets
import time
import os
from jose import jwt, JWTError

try:
    from .. import models, database, security
except (ImportError, ValueError):
    import models, database, security

try:
    import resend
    resend.api_key = os.environ.get("RESEND_API_KEY", "re_mock_key_for_dev")
except Exception:
    resend = None

router = APIRouter(
    prefix="/setup",
    tags=["First-Time Setup & Onboarding"]
)

# In-memory store for pending OTPs (Key: email.lower())
PENDING_OTP = {}

class SendOtpRequest(BaseModel):
    institution_name: str
    admin_name: str
    admin_email: str

class VerifyOtpRequest(BaseModel):
    admin_email: str
    otp: str

class CompleteSetupRequest(BaseModel):
    setup_token: str
    institution_name: str
    admin_name: str
    admin_email: str
    password: str

def is_system_already_initialized(db: Session) -> bool:
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "is_setup_completed").first()
    if setting and setting.value and setting.value.lower() == "true":
        admin_count = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).count()
        if admin_count > 0:
            return True
    return False

@router.get("/status")
def get_setup_status(db: Session = Depends(database.get_db)):
    setting_done = db.query(models.SystemSetting).filter(models.SystemSetting.key == "is_setup_completed").first()
    inst_name = db.query(models.SystemSetting).filter(models.SystemSetting.key == "institution_name").first()
    admin_count = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).count()

    is_initialized = False
    if setting_done and setting_done.value == "true" and admin_count > 0:
        is_initialized = True
    elif admin_count > 0:
        is_initialized = True

    return {
        "is_initialized": is_initialized,
        "institution_name": inst_name.value if inst_name else "",
        "admin_count": 1 if admin_count > 0 else 0
    }

@router.post("/send-otp")
def send_setup_otp(payload: SendOtpRequest, db: Session = Depends(database.get_db)):
    if is_system_already_initialized(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System is already initialized and permanently locked. Contact your university master administrator."
        )
    email_clean = payload.admin_email.strip().lower()
    inst_name = payload.institution_name.strip()
    admin_name = payload.admin_name.strip()

    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="A valid institutional email address is required.")
    if not inst_name:
        raise HTTPException(status_code=400, detail="University/College name is required.")

    # Generate 6-digit cryptographically secure OTP
    otp_code = str(secrets.randbelow(900000) + 100000)
    expires_at = time.time() + 600  # 10 minutes

    PENDING_OTP[email_clean] = {
        "otp": otp_code,
        "expires_at": expires_at,
        "institution_name": inst_name,
        "admin_name": admin_name,
        "attempts": 0
    }

    # Console display for developers & local inspection
    print("\n" + "=" * 55)
    print(f"[SECURITY OTP] Verification Code for {email_clean}: {otp_code}")
    print(f"Institution: {inst_name} | Valid for 10 minutes")
    print("=" * 55 + "\n")

    # Send via Resend Email service if configured
    email_dispatched = False
    dispatch_error = None
    html_email_template = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: auto; padding: 28px; border: 1px solid #E2E8F0; border-radius: 20px; background-color: #FFFFFF;">
        <div style="display: inline-block; padding: 6px 12px; background: #EEF2F6; border-radius: 12px; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 16px;">
            INSTITUTION SETUP VERIFICATION
        </div>
        <h2 style="color: #0F172A; font-size: 20px; margin-top: 0;">Verify Master Administrator Email</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Hello <b>{admin_name}</b>,<br>
            You are initializing the Smart Attendance & Biometric Governance Platform for <b>{inst_name}</b>.
            Use the one-time security verification code below to authorize your account:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0F172A; background: #F8FAFC; padding: 14px 28px; border-radius: 16px; border: 2px dashed #CBD5E1;">
                {otp_code}
            </span>
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5;">
            ⏱️ This security code is valid for <b>10 minutes</b>. If you did not request this setup, please disregard this email.
        </p>
    </div>
    """

    # Send verification email via centralized email engine (Resend API + SMTP fallback)
    try:
        from ..services.email_service import send_system_email
    except (ImportError, ValueError):
        from services.email_service import send_system_email

    email_dispatched, dispatch_error = send_system_email(
        to_email=email_clean,
        subject=f"Security Verification Code: {otp_code} - {inst_name} Setup",
        html_content=html_email_template,
        sender_name=f"{inst_name} Governance"
    )

    return {
        "success": True,
        "message": f"Verification code dispatched to {email_clean}." if email_dispatched else f"Sandbox mode: {dispatch_error or 'Simulated'}",
        "expires_in": 600,
        "email_dispatched": email_dispatched,
        "dispatch_error": dispatch_error
    }

@router.post("/verify-otp")
def verify_setup_otp(payload: VerifyOtpRequest):
    email_clean = payload.admin_email.strip().lower()
    record = PENDING_OTP.get(email_clean)

    if not record:
        raise HTTPException(
            status_code=400,
            detail="No pending verification found for this email. Please request a new code."
        )

    if time.time() > record["expires_at"]:
        PENDING_OTP.pop(email_clean, None)
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired. Please request a fresh code."
        )

    record["attempts"] += 1
    if record["attempts"] > 5:
        PENDING_OTP.pop(email_clean, None)
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect verification attempts. Please request a new code."
        )

    if payload.otp.strip() != record["otp"]:
        remaining = 5 - record["attempts"]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # Issue single-use setup session token (valid 15 mins)
    setup_token = jwt.encode(
        {
            "sub": email_clean,
            "type": "setup_session",
            "inst": record["institution_name"],
            "name": record["admin_name"],
            "exp": datetime.utcnow() + timedelta(minutes=15)
        },
        security.SECRET_KEY,
        algorithm=security.ALGORITHM
    )

    return {
        "success": True,
        "message": "Email ownership verified successfully.",
        "setup_token": setup_token
    }

@router.post("/complete")
def complete_institution_setup(payload: CompleteSetupRequest, db: Session = Depends(database.get_db)):
    if is_system_already_initialized(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System is already initialized and permanently locked. Setup cannot be re-executed."
        )
    # 1. Validate setup token
    try:
        token_payload = jwt.decode(payload.setup_token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        if token_payload.get("type") != "setup_session":
            raise HTTPException(status_code=401, detail="Invalid setup token authorization.")
        if token_payload.get("sub") != payload.admin_email.strip().lower():
            raise HTTPException(status_code=401, detail="Setup token email mismatch.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Setup token expired or corrupted. Please re-verify email.")

    # 2. Validate password strength
    pwd = payload.password.strip()
    if len(pwd) < 8:
        raise HTTPException(status_code=400, detail="Master password must be at least 8 characters long.")

    email_clean = payload.admin_email.strip().lower()
    inst_name = payload.institution_name.strip()

    # 3. Create or update Super Admin user with bcrypt
    admin_user = db.query(models.User).filter(models.User.email == email_clean).first()
    if not admin_user:
        admin_user = models.User(
            email=email_clean,
            hashed_password=security.get_password_hash(pwd),
            role=models.RoleEnum.admin,
            is_active=True
        )
        db.add(admin_user)
    else:
        admin_user.hashed_password = security.get_password_hash(pwd)
        admin_user.role = models.RoleEnum.admin
        admin_user.is_active = True

    # 4. Save Institution settings in SystemSetting
    def set_system_key(k: str, v: str):
        row = db.query(models.SystemSetting).filter(models.SystemSetting.key == k).first()
        if row:
            row.value = v
        else:
            db.add(models.SystemSetting(key=k, value=v))

    set_system_key("institution_name", inst_name)
    set_system_key("admin_name", payload.admin_name.strip())
    set_system_key("is_setup_completed", "true")
    set_system_key("admin_email", email_clean)
    set_system_key("setup_timestamp", datetime.utcnow().isoformat())

    db.commit()
    db.refresh(admin_user)

    # Invalidate OTP record
    PENDING_OTP.pop(email_clean, None)

    # Generate persistent admin access token
    access_token = security.create_access_token(
        data={"sub": admin_user.email, "role": admin_user.role.value}
    )

    return {
        "success": True,
        "message": f"Super Admin for {inst_name} successfully configured and secured.",
        "access_token": access_token,
        "institution_name": inst_name,
        "admin_email": admin_user.email
    }
