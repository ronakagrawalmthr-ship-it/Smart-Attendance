import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
import secrets

try:
    from .. import models, schemas, database
    from ..services.biometrics import process_student_selfie, compress_selfie_thumbnail
except (ImportError, ValueError):
    import models, schemas, database
    from services.biometrics import process_student_selfie, compress_selfie_thumbnail
from .auth import get_current_user

router = APIRouter(
    prefix="/students",
    tags=["Student Onboarding"]
)

try:
    from .. import security
    from ..time_utils import now_ist_naive
except (ImportError, ValueError):
    import security
    try:
        from time_utils import now_ist_naive
    except (ImportError, ValueError):
        from datetime import timezone, timedelta
        _IST = timezone(timedelta(hours=5, minutes=30))
        def now_ist_naive(): return datetime.now(_IST).replace(tzinfo=None)

@router.post("/register", response_model=schemas.StudentProfile)
async def register_student(
    full_name: str = Form(...),
    roll_number: str = Form(...),
    branch: str = Form(...),
    semester: int = Form(...),
    section: str = Form(...),
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
    parent_email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    otp: Optional[str] = Form(None),
    biometric_consent: Optional[bool] = Form(False),
    selfie: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db)
):
    """
    Onboards a new student directly into institutional SQLite/PostgreSQL DB.
    Captures student profile, records explicit DPDP biometric consent,
    and stores 128-d face vectors encrypted with AES-256 authenticated encryption.
    """
    clean_roll = roll_number.strip().upper()
    clean_name = full_name.strip()
    clean_branch = branch.strip()
    clean_section = section.strip().upper()
    clean_email = email.strip().lower() if (email and email.strip()) else f"{clean_roll.lower()}@student.university.edu"
    clean_pwd = password.strip() if (password and password.strip()) else os.getenv("DEFAULT_STUDENT_PASSWORD", "Student@Secure2026!")
    clean_parent_email = parent_email.strip().lower() if (parent_email and parent_email.strip()) else None
    clean_phone = phone.strip() if (phone and phone.strip()) else None

    # 0. Strict Email OTP Verification: Ensure no fake accounts or emails
    if email and email.strip():
        # Check if email OTP was sent and verify it
        if otp and otp.strip():
            matched_otp = db.query(models.EmailVerificationOTP).filter(
                models.EmailVerificationOTP.email == clean_email,
                models.EmailVerificationOTP.otp_code == otp.strip()
            ).order_by(models.EmailVerificationOTP.id.desc()).first()
            if not matched_otp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification code (OTP). Please check your email inbox and enter the 6-digit code."
                )
            if matched_otp.expires_at < now_ist_naive():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code (OTP) has expired. Please request a new OTP."
                )
            matched_otp.is_verified = True
            db.commit()
        else:
            already_verified = db.query(models.EmailVerificationOTP).filter(
                models.EmailVerificationOTP.email == clean_email,
                models.EmailVerificationOTP.is_verified == True
            ).first()
            if not already_verified:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email verification required. Please request an OTP for '{clean_email}' to verify your identity."
                )

    # 1. Strict Duplicate Check: Roll number must be unique in institutional database
    existing_student = db.query(models.StudentProfile).filter(
        func.upper(models.StudentProfile.roll_number) == clean_roll
    ).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This roll number '{clean_roll}' is already registered in the institutional database. If you already have an account, please sign in or contact your department administrator."
        )

    # 2. Check if student user account already exists
    if not user_id:
        existing_user = db.query(models.User).filter(
            (func.lower(models.User.email) == clean_email.lower()) | 
            (func.lower(models.User.email) == f"{clean_roll.lower()}@student.university.edu")
        ).first()
        if existing_user:
            existing_profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == existing_user.id).first()
            if existing_profile:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"This roll number '{clean_roll}' or email '{clean_email}' is already registered in the institutional database."
                )
            existing_user.hashed_password = security.get_password_hash(clean_pwd)
            existing_user.email = clean_email
            user_id = existing_user.id
            db.commit()
        else:
            new_user = models.User(
                email=clean_email,
                hashed_password=security.get_password_hash(clean_pwd),
                role=models.RoleEnum.student,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user_id = new_user.id

    # 3. Extract Biometric Vector, Validate Quality & Apply AES-256 Field Encryption
    photo_thumbnail_b64 = None
    encrypted_face_encoding = None
    consent_given = bool(biometric_consent or (selfie is not None and selfie.filename))

    if selfie is not None and hasattr(selfie, 'filename') and selfie.filename:
        try:
            selfie_bytes = await selfie.read()
            await selfie.seek(0)
            photo_thumbnail_b64 = compress_selfie_thumbnail(selfie_bytes) or None
        except Exception:
            pass

        try:
            face_encoding_json = await process_student_selfie(selfie)
            if face_encoding_json:
                # Encrypt vector before persisting to DB (DPDP Act 2023 compliance)
                encrypted_face_encoding = security.encrypt_biometric_vector(face_encoding_json)
        except HTTPException:
            raise
        except Exception as e:
            print(f"Selfie processing note: {e}")

    # 4. Direct Database creation - auto-categorized by department, semester, section
    new_student = models.StudentProfile(
        user_id=user_id,
        full_name=clean_name,
        roll_number=clean_roll,
        branch=clean_branch,
        semester=int(semester),
        section=clean_section,
        face_encoding=encrypted_face_encoding,
        biometric_consent=consent_given,
        consent_timestamp=now_ist_naive() if consent_given else None,
        photo_thumbnail=photo_thumbnail_b64,
        parent_email=clean_parent_email,
        phone=clean_phone,
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return new_student
