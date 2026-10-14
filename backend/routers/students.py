from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
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
except (ImportError, ValueError):
    import security

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
    selfie: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """
    Onboards a new student directly into institutional SQLite DB.
    Captures full student profile, auto-categorizes by department, semester and section,
    allows students to set their own custom login email and password,
    and extracts a 128-d face vector from their live selfie.
    Enforces strict duplicate roll number rejection with clear English feedback.
    """
    clean_roll = roll_number.strip().upper()
    clean_name = full_name.strip()
    clean_branch = branch.strip()
    clean_section = section.strip().upper()
    clean_email = email.strip().lower() if (email and email.strip()) else f"{clean_roll.lower()}@student.university.edu"
    clean_pwd = password.strip() if (password and password.strip()) else clean_roll
    clean_parent_email = parent_email.strip().lower() if (parent_email and parent_email.strip()) else None
    clean_phone = phone.strip() if (phone and phone.strip()) else None

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

    # 3. Extract Biometric Vector & Selfie Thumbnail
    photo_thumbnail_b64 = None
    try:
        selfie_bytes = await selfie.read()
        await selfie.seek(0)
        photo_thumbnail_b64 = compress_selfie_thumbnail(selfie_bytes) or None
    except Exception:
        pass

    face_encoding_json = await process_student_selfie(selfie)

    # 4. Direct Database creation - auto-categorized by department, semester, section
    new_student = models.StudentProfile(
        user_id=user_id,
        full_name=clean_name,
        roll_number=clean_roll,
        branch=clean_branch,
        semester=int(semester),
        section=clean_section,
        face_encoding=face_encoding_json,
        photo_thumbnail=photo_thumbnail_b64,
        parent_email=clean_parent_email,
        phone=clean_phone,
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return new_student
