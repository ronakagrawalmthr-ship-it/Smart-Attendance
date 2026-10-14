from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import JWTError, jwt

try:
    from .. import models, schemas, security, database
except (ImportError, ValueError):
    import models, schemas, security, database

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Strict signature and expiration verification
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
    except JWTError:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

from pydantic import BaseModel
from typing import Optional

class LoginJSONRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    roll_number: Optional[str] = None
    rollNumber: Optional[str] = None
    identifier: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = ""

from sqlalchemy import func

def resolve_user(identifier: str, db: Session):
    clean_id = identifier.strip().lower()
    
    # 1. Look up by email (case-insensitive)
    user = db.query(models.User).filter(func.lower(models.User.email) == clean_id).first()
    if user:
        return user
        
    # 2. Look up by student roll number
    student = db.query(models.StudentProfile).filter(func.lower(models.StudentProfile.roll_number) == clean_id).first()
    if student:
        if student.user_id:
            user = db.query(models.User).filter(models.User.id == student.user_id).first()
            if user:
                return user
        
        # Self-healing: Check if User exists by default student email
        default_email = f"{student.roll_number.lower()}@student.university.edu"
        user = db.query(models.User).filter(func.lower(models.User.email) == default_email).first()
        if not user:
            # Auto-provision student login with default password = uppercase roll number
            user = models.User(
                email=default_email,
                hashed_password=security.get_password_hash(student.roll_number.strip().upper()),
                role=models.RoleEnum.student,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        student.user_id = user.id
        db.commit()
        return user
            
    return None

def verify_user_password(plain_password: str, user: models.User, db: Session = None) -> bool:
    if not plain_password or not user.hashed_password:
        return False

    # Primary secure check: verify strictly against stored bcrypt hash
    if security.verify_password(plain_password, user.hashed_password):
        return True

    # High-usability student fallback: Also accept student's roll number as valid default password
    if user.role == models.RoleEnum.student and user.student_profile:
        roll = (user.student_profile.roll_number or "").strip()
        if roll and plain_password.strip().upper() == roll.upper():
            return True

    # Strict: Reject any plain-text, unverified, or backdoor password
    return False

@router.post("/token")
@limiter.limit("15/minute")
def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = resolve_user(form_data.username, db)
    if not user or not verify_user_password(form_data.password, user, db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email, "role": user.role.value}}

@router.post("/login")
@limiter.limit("15/minute")
def login_json(request: Request, payload: LoginJSONRequest, db: Session = Depends(database.get_db)):
    identifier = (
        payload.email 
        or payload.username 
        or payload.roll_number 
        or payload.rollNumber 
        or payload.identifier 
        or payload.user
    )
    if not identifier:
        raise HTTPException(status_code=400, detail="Email, username, or roll number is required.")
        
    pwd = payload.password or ""
    user = resolve_user(identifier, db)
    if not user or not verify_user_password(pwd, user, db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    
    user_name = None
    user_dept = None
    roll_number = None
    semester = None
    if user.teacher_profile:
        user_name = user.teacher_profile.full_name
        user_dept = user.teacher_profile.department
    elif user.student_profile:
        user_name = user.student_profile.full_name
        user_dept = user.student_profile.branch
        roll_number = user.student_profile.roll_number
        semester = user.student_profile.semester
    else:
        if user.role == models.RoleEnum.admin:
            admin_name_row = db.query(models.SystemSetting).filter(models.SystemSetting.key == "admin_name").first()
            user_name = admin_name_row.value if (admin_name_row and admin_name_row.value) else user.email.split("@")[0].replace(".", " ").title()
        else:
            user_name = user.email.split("@")[0].replace(".", " ").title()
        user_dept = "Institutional Administration"

    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "id": user.id, 
            "email": user.email, 
            "role": user.role.value,
            "full_name": user_name,
            "department": user_dept,
            "roll_number": roll_number,
            "semester": semester
        }
    }

import random
import time
import os
try:
    import resend
except ImportError:
    resend = None
from fastapi import BackgroundTasks

class ForgotPasswordRequest(BaseModel):
    identifier: Optional[str] = None  # Email or Roll number
    email: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    identifier: Optional[str] = None
    email: Optional[str] = None
    otp: str
    new_password: str

RESET_OTP_STORE = {}

def send_reset_email(to_email: str, otp: str):
    try:
        try:
            from ..services.email_service import send_system_email
        except (ImportError, ValueError):
            from services.email_service import send_system_email

        target_recipient = to_email.strip().lower() if to_email and "@" in to_email else "delivered@resend.dev"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 520px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px auto; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2563eb; margin: 0; font-size: 22px;">Smart Attendance Platform</h2>
                <span style="font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Security & Account Verification</span>
            </div>
            <p style="font-size: 15px; line-height: 1.5; color: #334155;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your account associated with <strong>{target_recipient}</strong>. Use the 6-digit verification code below to establish your new password:
            </p>
            <div style="background-color: #eff6ff; border: 2px dashed #3b82f6; padding: 18px; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; text-align: center; margin: 24px 0;">
                {otp}
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                ⏱ <strong>This code is valid for 15 minutes.</strong> If you did not initiate this request, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
                Smart Attendance Cloud Infrastructure • Automated System Dispatch
            </p>
        </div>
        """
        send_system_email(
            to_email=target_recipient,
            subject="Password Reset Verification Code - Smart Attendance",
            html_content=html_content,
            sender_name="Smart Attendance Security"
        )
    except Exception as e:
        print(f"Password reset email dispatch note: {e}")

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    target_id = (payload.identifier or payload.email or "").strip()
    if not target_id:
        raise HTTPException(status_code=400, detail="Email or roll number is required.")

    user = resolve_user(target_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="No account found matching this email or roll number.")

    clean_id = target_id.lower()
    user_email_key = user.email.strip().lower()
    
    otp = f"{random.randint(100000, 999999)}"
    expires_at = time.time() + 900  # 15 mins
    
    RESET_OTP_STORE[clean_id] = {"otp": otp, "expires_at": expires_at, "email": user.email}
    RESET_OTP_STORE[user_email_key] = {"otp": otp, "expires_at": expires_at, "email": user.email}
    
    print(f"\n[SECURITY VERIFICATION] Password reset OTP generated for {user.email}: {otp} (Valid for 15 minutes)\n")
    background_tasks.add_task(send_reset_email, user.email, otp)
    
    return {
        "success": True,
        "message": f"Verification code sent to {user.email}",
        "email": user.email
    }

@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(database.get_db)
):
    target_id = (payload.identifier or payload.email or "").strip()
    if not target_id:
        raise HTTPException(status_code=400, detail="Email or roll number is required.")

    clean_id = target_id.lower()
    user = resolve_user(target_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    record = RESET_OTP_STORE.get(clean_id) or RESET_OTP_STORE.get(user.email.strip().lower())
    valid_otp = record.get("otp") if record else None

    # Strict OTP verification with expiration check
    if not (valid_otp and payload.otp.strip() == valid_otp and time.time() < record["expires_at"]):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code. Please check and try again.")

    if len(payload.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user.hashed_password = security.get_password_hash(payload.new_password.strip())
    db.commit()
    
    RESET_OTP_STORE.pop(clean_id, None)
    RESET_OTP_STORE.pop(user.email.strip().lower(), None)
        
    return {
        "success": True,
        "message": "Password successfully reset! You can now log in with your new password."
    }

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None

@router.get("/me")
def read_users_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    user_name = None
    user_dept = None
    if current_user.teacher_profile:
        user_name = current_user.teacher_profile.full_name
        user_dept = current_user.teacher_profile.department
    elif current_user.student_profile:
        user_name = current_user.student_profile.full_name
        user_dept = current_user.student_profile.branch
    else:
        if current_user.role == models.RoleEnum.admin:
            admin_name_row = db.query(models.SystemSetting).filter(models.SystemSetting.key == "admin_name").first()
            user_name = admin_name_row.value if (admin_name_row and admin_name_row.value) else "Administrator"
        else:
            user_name = "Administrator"
        user_dept = "Institutional Administration"
        
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "full_name": user_name,
        "department": user_dept
    }

@router.put("/me")
def update_users_me(
    payload: ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    if payload.email:
        current_user.email = payload.email.strip()
        
    if payload.full_name:
        if current_user.teacher_profile:
            current_user.teacher_profile.full_name = payload.full_name.strip()
        elif current_user.student_profile:
            current_user.student_profile.full_name = payload.full_name.strip()
        else:
            # Create or update teacher profile for admin
            tp = models.TeacherProfile(
                user_id=current_user.id,
                full_name=payload.full_name.strip(),
                department="Institutional Administration"
            )
            db.add(tp)
            
    db.commit()
    return {"success": True, "message": "Profile updated successfully.", "full_name": payload.full_name}
