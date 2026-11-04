from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import time
import os
from jose import jwt, JWTError

try:
    from .. import models, database, security
    from ..time_utils import now_ist_naive
except (ImportError, ValueError):
    import models, database, security
    try:
        from time_utils import now_ist_naive
    except (ImportError, ValueError):
        from datetime import timezone
        _IST = timezone(timedelta(hours=5, minutes=30))
        def now_ist_naive(): return datetime.now(_IST).replace(tzinfo=None)

try:
    import resend
    resend_key = os.environ.get("RESEND_API_KEY", "").strip()
    resend.api_key = resend_key if resend_key else None
except Exception:
    resend = None

router = APIRouter(
    prefix="/setup",
    tags=["First-Time Setup & Onboarding"]
)

# Persistent Database-Backed Setup OTP Engine (Models.EmailVerificationOTP)
def cleanup_expired_setup_otps(db: Session = None):
    if db:
        try:
            now_dt = now_ist_naive()
            db.query(models.EmailVerificationOTP).filter(
                models.EmailVerificationOTP.expires_at < now_dt,
                models.EmailVerificationOTP.purpose == "setup"
            ).delete()
            db.commit()
        except Exception:
            db.rollback()

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
    admin_count = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).count()
    if admin_count > 0:
        return True
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "is_setup_completed").first()
    if setting and setting.value and setting.value.lower() == "true":
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
    cleanup_expired_setup_otps()
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

    now_dt = now_ist_naive()
    expires_at_dt = now_dt + timedelta(minutes=10)
    
    # Invalidate previous unverified setup OTPs
    db.query(models.EmailVerificationOTP).filter(
        models.EmailVerificationOTP.email == email_clean,
        models.EmailVerificationOTP.purpose == "setup",
        models.EmailVerificationOTP.is_verified == False
    ).delete()

    otp_record = models.EmailVerificationOTP(
        email=email_clean,
        otp_code=otp_code,
        purpose="setup",
        expires_at=expires_at_dt,
        is_verified=False,
        created_at=now_dt
    )
    db.add(otp_record)
    db.commit()

    # Console display for developers & local inspection (gated behind DEBUG)
    if os.getenv("DEBUG", "false").lower() in ("true", "1", "yes"):
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
def verify_setup_otp(payload: VerifyOtpRequest, db: Session = Depends(database.get_db)):
    if is_system_already_initialized(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System is already initialized and permanently locked."
        )
    cleanup_expired_setup_otps()
    email_clean = payload.admin_email.strip().lower()
    now_dt = now_ist_naive()

    otp_record = db.query(models.EmailVerificationOTP).filter(
        models.EmailVerificationOTP.email == email_clean,
        models.EmailVerificationOTP.purpose == "setup",
        models.EmailVerificationOTP.is_verified == False,
        models.EmailVerificationOTP.expires_at >= now_dt
    ).order_by(models.EmailVerificationOTP.id.desc()).first()

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="No pending or unexpired verification code found for this email. Please request a new code."
        )

    if payload.otp.strip() != otp_record.otp_code.strip():
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code. Please check your inbox and try again."
        )

    # Mark OTP as verified
    otp_record.is_verified = True
    db.commit()

    # Issue single-use setup session token (valid 15 mins)
    setup_token = jwt.encode(
        {
            "sub": email_clean,
            "type": "setup_session",
            "inst": "Smart Campus Institute",
            "name": "Administrator",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
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
    set_system_key("setup_timestamp", now_ist_naive().isoformat())

    db.commit()
    db.refresh(admin_user)

    # Invalidate OTP record
    # Invalidate setup OTP records in DB
    db.query(models.EmailVerificationOTP).filter(
        models.EmailVerificationOTP.email == email_clean,
        models.EmailVerificationOTP.purpose == "setup"
    ).delete()
    db.commit()

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
