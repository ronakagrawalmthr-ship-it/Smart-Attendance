from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional

try:
    from .. import models, schemas, database
    from ..services.biometrics import process_student_selfie
except (ImportError, ValueError):
    import models, schemas, database
    from services.biometrics import process_student_selfie
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
    user_id: Optional[int] = Form(None),
    selfie: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """
    Onboards a new student. Captures their foundational data and extracts 
    the 128-d face vector from their live selfie. The raw selfie is not saved.
    Supports student self-onboarding as well as admin/HOD enrollment.
    """
    # Check if student already exists
    existing_student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll_number).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="Student with this roll number already exists.")
        
    # Auto-provision student user credentials if not passed
    if not user_id:
        student_email = f"{roll_number.lower()}@student.college.edu"
        user = db.query(models.User).filter(models.User.email == student_email).first()
        if not user:
            user = models.User(
                email=student_email,
                hashed_password=security.get_password_hash("StudentPass123!"),
                role=models.RoleEnum.student,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        user_id = user.id

    # Extract Biometric Vector
    face_encoding_json = await process_student_selfie(selfie)
    
    # Create the DB record
    new_student = models.StudentProfile(
        user_id=user_id,
        full_name=full_name,
        roll_number=roll_number,
        branch=branch,
        semester=semester,
        section=section,
        face_encoding=face_encoding_json
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    return new_student
