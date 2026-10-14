from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

try:
    from .. import models, schemas, database, security
    from services.biometrics import compare_group_faces, compare_group_faces_with_scores, verify_liveness
    from ..sort_utils import natural_sort_key
except (ImportError, ValueError):
    import models, schemas, database, security
    from services.biometrics import compare_group_faces, compare_group_faces_with_scores, verify_liveness
    try:
        from sort_utils import natural_sort_key
    except (ImportError, ValueError):
        import re
        def natural_sort_key(val):
            if val is None:
                return []
            s = str(val).strip()
            key = []
            for chunk in re.split(r'(\d+)', s):
                if not chunk:
                    continue
                if chunk.isdigit():
                    key.append((0, int(chunk)))
                else:
                    key.append((1, chunk.lower()))
            return key
from typing import Optional, List, Dict, Any
from jose import jwt, JWTError
try:
    from .. import security
except (ImportError, ValueError):
    import security
from .auth import get_current_user

def get_current_user_optional(request: Request, db: Session = Depends(database.get_db)) -> Optional[models.User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email = payload.get("sub")
        if email:
            return db.query(models.User).filter(models.User.email == email).first()
    except Exception:
        pass
    return None

router = APIRouter(
    prefix="/attendance",
    tags=["Teacher Mobile Kiosk"]
)

@router.post("/scan/{session_id}")
async def process_classroom_scan(
    session_id: int,
    request: Request,
    image: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Teacher Mobile Kiosk endpoint.
    Takes a live classroom photo, detects all faces, matches them against the expected students
    for the given session, and marks attendance to prevent proxy.
    """
    if current_user.role != models.RoleEnum.teacher:
        raise HTTPException(status_code=403, detail="Only teachers can perform classroom scans.")
        
    # Verify the session exists and belongs to the teacher or an authorized proxy teacher
    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    is_owner = session.teacher.user_id == current_user.id
    is_proxy = False
    if not is_owner and current_user.teacher_profile:
        from datetime import datetime
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        proxy_exists = db.query(models.ProxyAssignment).filter(
            models.ProxyAssignment.proxy_teacher_id == current_user.teacher_profile.id,
            models.ProxyAssignment.subject_id == session.subject_id,
            models.ProxyAssignment.date == today_str,
            models.ProxyAssignment.status == "Active"
        ).first()
        if proxy_exists:
            is_proxy = True

    if not is_owner and not is_proxy:
        raise HTTPException(status_code=403, detail="Not authorized to take attendance for this session.")
        
    # Get all students registered for this branch/semester/section, strictly sorted by roll number
    students_query = db.query(models.StudentProfile).filter(
        models.StudentProfile.branch == session.branch,
        # session.section could be None if it's the whole branch
        (models.StudentProfile.section == session.section) | (session.section == None)
    ).order_by(models.StudentProfile.roll_number.asc()).all()
    students = sorted(students_query, key=lambda s: natural_sort_key(s.roll_number))
    
    # Build dictionary of known vectors
    known_vectors = {}
    for student in students:
        if student.face_encoding:
            try:
                # Deserialize the JSON string to a list of floats
                vector = json.loads(student.face_encoding)
                known_vectors[student.roll_number] = vector
            except Exception:
                pass
                
    if not known_vectors:
        return {"message": "No registered biometric profiles found for this class.", "present": []}

    image_bytes = await image.read()
    
    # Process the group scan — returns {roll_number: confidence_pct}
    matched_scores = compare_group_faces_with_scores(image_bytes, known_vectors)
    present_roll_numbers = sorted(matched_scores.keys(), key=natural_sort_key)
    
    # Mark attendance in database in sequential roll number order
    attendance_records = []
    for student in students:
        roll = student.roll_number
        is_present = roll in matched_scores
        confidence = matched_scores.get(roll, None)  # Real face-match score
        
        # Anti-proxy safeguard: Check if attendance already marked
        existing_log = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == session_id,
            models.AttendanceLog.student_id == student.id
        ).first()
        
        if existing_log:
            # Update only if they were marked absent before and are now present
            if not existing_log.is_present and is_present:
                existing_log.is_present = True
                if confidence is not None:
                    existing_log.confidence_score = confidence
        else:
            new_log = models.AttendanceLog(
                session_id=session_id,
                student_id=student.id,
                is_present=is_present,
                confidence_score=confidence
            )
            db.add(new_log)
            attendance_records.append(new_log)
            
    # Audit Log
    audit = models.AuditLog(
        user_id=current_user.id,
        action=f"Submitted attendance scan for session {session_id}. {len(present_roll_numbers)} marked present.",
        ip_address=request.client.host,
        device_info=request.headers.get("user-agent")
    )
    db.add(audit)
    
    db.commit()
    
    return {
        "message": f"Scan complete. {len(present_roll_numbers)} students marked present.",
        "present_roll_numbers": present_roll_numbers
    }

@router.post("/verify_single/{session_id}")
async def verify_single_student_walkup(
    session_id: int,
    request: Request,
    image: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Teacher Mobile Kiosk: Single Student Walk-Up & Anti-Spoofing Scan.
    Verifies liveness, matches face, and prevents duplicate scans.
    """
    if current_user.role not in [models.RoleEnum.teacher, models.RoleEnum.hod, models.RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Faculty authorization required for classroom biometric verification.")

    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if not session:
        # If session does not exist, check if session_id is a subject ID or temporary ID
        sub = db.query(models.Subject).filter(models.Subject.id == session_id).first()
        branch = sub.branch if sub else (current_user.teacher_profile.department if current_user.teacher_profile else "Computer Science")
        semester = sub.semester if sub else 6
        conductor = current_user.teacher_profile.full_name if current_user.teacher_profile else current_user.email.split("@")[0].title()
        now = datetime.utcnow()
        session = models.AcademicSession(
            teacher_id=current_user.teacher_profile.id if current_user.teacher_profile else None,
            subject_id=sub.id if sub else None,
            session_type=models.SessionType.lecture,
            start_time=now,
            end_time=now + timedelta(hours=1),
            branch=branch,
            semester=semester,
            section="A",
            conducted_by_name=conductor
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    image_bytes = await image.read()

    # 1. Anti-Spoofing Liveness Verification
    liveness_result = verify_liveness(image_bytes)
    if not liveness_result["is_live"]:
        return {
            "success": False,
            "error": "Liveness check failed. Please ensure a live person is in front of the camera.",
            "liveness": liveness_result
        }

    # 2. Get registered students
    students = db.query(models.StudentProfile).filter(
        models.StudentProfile.branch == session.branch
    ).all()

    known_vectors = {}
    student_map = {}
    for student in students:
        if student.face_encoding:
            try:
                known_vectors[student.roll_number] = json.loads(student.face_encoding)
                student_map[student.roll_number] = student
            except Exception:
                pass

    if not known_vectors:
        return {"success": False, "error": "No student biometric profiles enrolled for this class."}

    # 3. Match face against class enrollment
    matched_rolls = compare_group_faces(image_bytes, known_vectors)
    if not matched_rolls:
        return {"success": False, "error": "Face not recognized in enrolled class roster."}

    matched_roll = matched_rolls[0]
    matched_student = student_map[matched_roll]

    # 4. Check for duplicate and record Attendance Log immediately in SQLite database
    target_session_id = session.id
    existing_log = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.session_id == target_session_id,
        models.AttendanceLog.student_id == matched_student.id,
        models.AttendanceLog.is_present == True
    ).first()

    is_duplicate = existing_log is not None

    if not is_duplicate:
        log = models.AttendanceLog(
            session_id=target_session_id,
            student_id=matched_student.id,
            is_present=True,
            status_tag="PRESENT",
            timestamp=datetime.utcnow()
        )
        db.add(log)
        db.commit()

    return {
        "success": True,
        "is_duplicate": is_duplicate,
        "student": {
            "id": matched_student.id,
            "name": matched_student.full_name,
            "roll_number": matched_student.roll_number,
            "branch": matched_student.branch
        },
        "liveness": liveness_result
    }

def resolve_student_id(s: dict, db: Session):
    if isinstance(s, dict):
        if "id" in s and s["id"]:
            return s["id"]
        roll = s.get("roll") or s.get("roll_number")
        if roll:
            prof = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == str(roll).strip()).first()
            if prof:
                return prof.id
    return None

@router.get("/departments-meta")
def get_departments_meta(db: Session = Depends(database.get_db)):
    """
    Returns available branches/departments, semesters, sections, subjects, and teachers
    for dynamic classroom setup by any faculty member or guest lecturer.
    """
    branches_db = db.query(models.StudentProfile.branch).distinct().all()
    branches = sorted(list({b[0] for b in branches_db if b[0]}))
    if not branches:
        branches = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil"]

    semesters = [1, 2, 3, 4, 5, 6, 7, 8]
    sections = ["A", "B", "C"]

    subjects_db = db.query(models.Subject).all()
    subjects = [
        {
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "branch": s.branch,
            "semester": s.semester
        }
        for s in subjects_db
    ]

    teachers_db = db.query(models.TeacherProfile).all()
    teachers = [
        {
            "id": t.id,
            "name": t.full_name,
            "department": t.department
        }
        for t in teachers_db
    ]

    return {
        "branches": branches,
        "semesters": semesters,
        "sections": sections,
        "subjects": subjects,
        "teachers": teachers
    }

@router.get("/class-students")
def get_class_students(
    branch: str = "Computer Science",
    semester: int = None,
    section: str = None,
    request: Request = None,
    db: Session = Depends(database.get_db)
):
    """
    Returns student roster for the selected class/section for attendance marking.
    Protects private contact numbers: phone numbers are masked unless caller is authenticated.
    """
    is_authenticated = False
    if request:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                payload = security.decode_access_token(token)
                if payload:
                    is_authenticated = True
            except Exception:
                pass

    query = db.query(models.StudentProfile)
    if branch and branch != "all":
        query = query.filter(models.StudentProfile.branch.ilike(f"%{branch}%"))
    if semester:
        query = query.filter(models.StudentProfile.semester == semester)
    if section and section != "all":
        query = query.filter(models.StudentProfile.section == section)

    students_db = query.order_by(models.StudentProfile.roll_number.asc()).all()
    students = sorted(students_db, key=lambda s: natural_sort_key(s.roll_number))
    return {
        "branch": branch,
        "semester": semester,
        "section": section,
        "count": len(students),
        "students": [
            {
                "id": s.id,
                "roll_number": s.roll_number,
                "name": s.full_name,
                "branch": s.branch,
                "semester": s.semester,
                "section": s.section or "A",
                "phone": s.phone if is_authenticated else (f"******{s.phone[-4:]}" if s.phone and len(s.phone) >= 4 else None),
                "has_face": bool(s.face_encoding)
            }
            for s in students
        ]
    }

@router.post("/create-and-submit")
def create_session_and_submit_attendance(
    payload: dict,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Unified Teacher Classroom Submission:
    Submits attendance records under authenticated faculty credentials.
    """
    if current_user.role not in [models.RoleEnum.teacher, models.RoleEnum.hod, models.RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Faculty authorization required to submit attendance records.")

    branch = payload.get("branch", "Computer Science")
    semester = payload.get("semester", 6)
    section = payload.get("section", "A")
    session_type_str = payload.get("session_type", "lecture")
    subject_id = payload.get("subject_id")
    custom_subject_name = payload.get("custom_subject_name")
    conducted_by_name = (payload.get("conducted_by_name") or "").strip()
    notes = payload.get("notes")

    # Resolve session_type Enum
    try:
        resolved_session_type = models.SessionType(session_type_str)
    except Exception:
        resolved_session_type = models.SessionType.guest_lecture if session_type_str == "guest_lecture" else models.SessionType.lecture

    # Use authenticated user's teacher profile or conductor name
    teacher_prof = current_user.teacher_profile if (current_user and current_user.teacher_profile) else None
    if not teacher_prof and conducted_by_name:
        teacher_prof = db.query(models.TeacherProfile).filter(
            models.TeacherProfile.full_name.ilike(f"%{conducted_by_name}%")
        ).first()

    conductor_final = conducted_by_name or (teacher_prof.full_name if teacher_prof else current_user.email.split('@')[0].title())

    # If guest lecture, subject_id is optional and custom_subject_name is set
    if resolved_session_type == models.SessionType.guest_lecture and not custom_subject_name:
        custom_subject_name = "Special Guest Lecture"

    # Create AcademicSession
    now = datetime.utcnow()
    new_session = models.AcademicSession(
        teacher_id=teacher_prof.id if teacher_prof else None,
        subject_id=subject_id if (resolved_session_type != models.SessionType.guest_lecture or subject_id) else None,
        session_type=resolved_session_type,
        start_time=now,
        end_time=now + timedelta(hours=1),
        branch=branch,
        semester=int(semester) if semester else 6,
        section=section,
        conducted_by_name=conductor_final,
        custom_subject_name=custom_subject_name,
        notes=notes
    )
    db.add(new_session)
    db.flush()

    # Process attendance items
    raw_attendance = payload.get("attendance", [])
    present_list = payload.get("present", [])
    absent_list = payload.get("absent", [])

    present_count = 0
    absent_count = 0

    processed_items = []

    if raw_attendance:
        for item in raw_attendance:
            st_id = item.get("student_id") or resolve_student_id(item, db)
            if not st_id:
                continue
            roll = item.get("roll_number") or item.get("roll")
            if not roll:
                prof = db.query(models.StudentProfile).filter(models.StudentProfile.id == st_id).first()
                roll = prof.roll_number if prof else ""
            is_present = bool(item.get("is_present", False))
            status_tag = item.get("status_tag") or ("PRESENT" if is_present else "ABSENT")
            remarks = item.get("remarks")
            processed_items.append({
                "student_id": st_id,
                "roll_number": str(roll).strip(),
                "is_present": is_present,
                "status_tag": status_tag,
                "remarks": remarks
            })
    else:
        # Fallback to present / absent list format
        present_ids = {resolve_student_id(s, db) for s in present_list} - {None}
        absent_ids = {resolve_student_id(s, db) for s in absent_list} - {None}
        all_ids = list(present_ids | absent_ids)
        students_map = {st.id: st for st in db.query(models.StudentProfile).filter(models.StudentProfile.id.in_(all_ids)).all()} if all_ids else {}
        for st_id in present_ids:
            prof = students_map.get(st_id)
            roll = prof.roll_number if prof else ""
            processed_items.append({
                "student_id": st_id,
                "roll_number": str(roll).strip(),
                "is_present": True,
                "status_tag": "PRESENT",
                "remarks": None
            })
        for st_id in absent_ids:
            prof = students_map.get(st_id)
            roll = prof.roll_number if prof else ""
            processed_items.append({
                "student_id": st_id,
                "roll_number": str(roll).strip(),
                "is_present": False,
                "status_tag": "ABSENT",
                "remarks": None
            })

    # AUTOMATIC DETERMINISTIC SEQUENCING:
    # Sort strictly by student roll number in ascending order before inserting into database!
    processed_items.sort(key=lambda x: natural_sort_key(x["roll_number"]))

    for item in processed_items:
        if item["is_present"]:
            present_count += 1
        else:
            absent_count += 1

        db.add(models.AttendanceLog(
            session_id=new_session.id,
            student_id=item["student_id"],
            is_present=item["is_present"],
            status_tag=item["status_tag"],
            remarks=item["remarks"]
        ))

    # Audit Log
    client_host = request.client.host if request.client else "127.0.0.1"
    audit_action = f"Lecture conducted by '{conductor_final}' for {branch} Sem-{semester} Sec-{section}. Subject: '{custom_subject_name or 'Regular'}'. Present: {present_count}, Absent: {absent_count}."
    db.add(models.AuditLog(
        user_id=teacher_prof.user_id if teacher_prof else 1,
        action=audit_action,
        ip_address=client_host,
        device_info=request.headers.get("user-agent", "Teacher Web Terminal")
    ))

    db.commit()

    return {
        "success": True,
        "session_id": new_session.id,
        "conducted_by": conductor_final,
        "session_type": resolved_session_type.value if hasattr(resolved_session_type, 'value') else str(resolved_session_type),
        "custom_subject_name": custom_subject_name,
        "present_count": present_count,
        "absent_count": absent_count,
        "message": f"Attendance successfully committed to records. Conductor: {conductor_final} ({present_count} Present, {absent_count} Absent)."
    }

@router.post("/submit_final/{session_id}")
def submit_final_attendance(
    session_id: int,
    payload: dict,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Review Screen: Teacher submits the final reviewed and adjusted attendance roster.
    Supports both facial scan and manual additions/removals, along with conductor and guest lecture metadata.
    """
    if current_user.role not in [models.RoleEnum.teacher, models.RoleEnum.hod, models.RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Faculty authorization required to finalize attendance.")

    teacher_user = current_user

    # Update session metadata if provided, or initialize new session
    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if session:
        if payload.get("conducted_by_name"):
            session.conducted_by_name = payload["conducted_by_name"].strip()
        if payload.get("custom_subject_name"):
            session.custom_subject_name = payload["custom_subject_name"].strip()
        if payload.get("notes"):
            session.notes = payload["notes"].strip()
        if payload.get("semester"):
            session.semester = int(payload["semester"])
        if payload.get("session_type"):
            try:
                session.session_type = models.SessionType(payload["session_type"])
            except Exception:
                pass
    else:
        sub = db.query(models.Subject).filter(models.Subject.id == session_id).first()
        branch = payload.get("branch") or (sub.branch if sub else (current_user.teacher_profile.department if current_user.teacher_profile else "Computer Science"))
        semester = int(payload.get("semester") or (sub.semester if sub else 6))
        section = payload.get("section") or "A"
        conductor = (payload.get("conducted_by_name") or (current_user.teacher_profile.full_name if current_user.teacher_profile else current_user.email.split("@")[0].title())).strip()
        custom_sub = payload.get("custom_subject_name") or (sub.name if sub else None)
        sess_type_str = payload.get("session_type", "lecture")
        try:
            sess_type = models.SessionType(sess_type_str)
        except Exception:
            sess_type = models.SessionType.lecture
        
        now = datetime.utcnow()
        session = models.AcademicSession(
            teacher_id=current_user.teacher_profile.id if current_user.teacher_profile else None,
            subject_id=sub.id if sub else None,
            session_type=sess_type,
            start_time=now,
            end_time=now + timedelta(hours=1),
            branch=branch,
            semester=semester,
            section=section,
            conducted_by_name=conductor,
            custom_subject_name=custom_sub,
            notes=payload.get("notes")
        )
        db.add(session)
        db.flush()

    present_ids = {resolve_student_id(s, db) for s in payload.get("present", [])} - {None}
    absent_ids = {resolve_student_id(s, db) for s in payload.get("absent", [])} - {None}
    all_target_ids = list(present_ids | absent_ids)
    students_map = {st.id: st for st in db.query(models.StudentProfile).filter(models.StudentProfile.id.in_(all_target_ids)).all()} if all_target_ids else {}

    all_action_items = []
    for sid in present_ids:
        prof = students_map.get(sid)
        roll = prof.roll_number if prof else ""
        all_action_items.append({"student_id": sid, "roll_number": roll, "is_present": True, "status_tag": "PRESENT"})
    for sid in absent_ids:
        prof = students_map.get(sid)
        roll = prof.roll_number if prof else ""
        all_action_items.append({"student_id": sid, "roll_number": roll, "is_present": False, "status_tag": "ABSENT"})

    # AUTOMATIC SEQUENCING: Sort strictly by student roll number ascending
    all_action_items.sort(key=lambda x: natural_sort_key(x["roll_number"]))

    for action in all_action_items:
        student_id = action["student_id"]
        is_pres = action["is_present"]
        tag = action["status_tag"]
        log = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == session.id,
            models.AttendanceLog.student_id == student_id
        ).first()
        if log:
            log.is_present = is_pres
            log.status_tag = tag
        else:
            db.add(models.AttendanceLog(session_id=session.id, student_id=student_id, is_present=is_pres, status_tag=tag))

    # Audit Log
    user_id = teacher_user.id if teacher_user else 1
    client_host = request.client.host if request.client else "127.0.0.1"
    conductor_name = session.conducted_by_name if (session and session.conducted_by_name) else "Faculty"
    db.add(models.AuditLog(
        user_id=user_id,
        action=f"Teacher ({conductor_name}) finalized attendance for session {session.id}: {len(present_ids)} present, {len(absent_ids)} absent.",
        ip_address=client_host,
        device_info=request.headers.get("user-agent", "Teacher Mobile App")
    ))
    db.commit()

    return {
        "success": True,
        "message": f"Final attendance committed to institutional records: {len(present_ids)} Present, {len(absent_ids)} Absent.",
        "present_count": len(present_ids),
        "absent_count": len(absent_ids)
    }

# ==============================================================================
# DYNAMIC 10-SECOND ROTATING QR ATTENDANCE SYSTEM (ANTI-PROXY & SYSTEMATIC)
# ==============================================================================

from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import time
import secrets
from jose import jwt, JWTError
try:
    from .. import security
except (ImportError, ValueError):
    import security

class QRSessionInitRequest(BaseModel):
    subject_id: Optional[int] = None
    branch: str
    semester: int
    section: str = "A"
    session_type: str = "lecture"
    conducted_by_name: Optional[str] = None
    custom_subject_name: Optional[str] = None
    notes: Optional[str] = None

class QRVerifyStudentRequest(BaseModel):
    token: str
    student_roll: Optional[str] = None

def generate_dynamic_qr_jwt(session: models.AcademicSession) -> str:
    now_ts = int(time.time())
    # 15 seconds TTL (10s display + 5s network grace margin)
    payload = {
        "type": "dynamic_attendance_qr",
        "session_id": session.id,
        "subject_id": session.subject_id,
        "branch": session.branch,
        "semester": session.semester,
        "section": session.section,
        "iat": now_ts,
        "exp": now_ts + 15,
        "nonce": secrets.token_hex(4)
    }
    return jwt.encode(payload, security.SECRET_KEY, algorithm=security.ALGORITHM)

def check_branch_compatibility(student_branch: str, session_branch: str) -> bool:
    if not student_branch or not session_branch:
        return True
    s_clean = student_branch.lower().replace("&", "and").replace("engineering", "").strip()
    sess_clean = session_branch.lower().replace("&", "and").replace("engineering", "").strip()
    return s_clean in sess_clean or sess_clean in s_clean

@router.post("/qr/init-session")
def init_dynamic_qr_session(
    data: QRSessionInitRequest,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Teacher Portal: Initializes a live lecture session and generates the first 10-second Dynamic QR token.
    """
    if current_user and current_user.role == models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Students are not authorized to initialize a QR session.")

    sub = db.query(models.Subject).filter(models.Subject.id == data.subject_id).first() if data.subject_id else None
    
    # Resolve conductor and teacher profile gracefully
    teacher_prof = current_user.teacher_profile if (current_user and current_user.teacher_profile) else None
    if not teacher_prof and data.conducted_by_name:
        teacher_prof = db.query(models.TeacherProfile).filter(
            models.TeacherProfile.full_name.ilike(f"%{data.conducted_by_name}%")
        ).first()

    conductor = (data.conducted_by_name or (teacher_prof.full_name if teacher_prof else (current_user.email.split("@")[0].title() if current_user else "Faculty Coordinator"))).strip()
    subj_name = data.custom_subject_name or (sub.name if sub else "Classroom Session")

    sess_type_str = data.session_type or "lecture"
    try:
        sess_type = models.SessionType(sess_type_str)
    except Exception:
        sess_type = models.SessionType.lecture

    now = datetime.utcnow()
    session = models.AcademicSession(
        teacher_id=teacher_prof.id if teacher_prof else None,
        subject_id=sub.id if sub else None,
        session_type=sess_type,
        start_time=now,
        end_time=now + timedelta(hours=1),
        branch=data.branch,
        semester=data.semester,
        section=data.section.upper(),
        conducted_by_name=conductor,
        custom_subject_name=subj_name,
        notes=data.notes or "Live Dynamic QR Broadcast Active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    token = generate_dynamic_qr_jwt(session)

    total_expected = db.query(models.StudentProfile).filter(
        models.StudentProfile.branch == session.branch,
        models.StudentProfile.semester == session.semester,
        models.StudentProfile.section == session.section
    ).count()

    return {
        "success": True,
        "session_id": session.id,
        "token": token,
        "expires_in": 10,
        "subject_name": subj_name,
        "subject_code": sub.code if sub else "CORE",
        "conducted_by": conductor,
        "branch": session.branch,
        "semester": session.semester,
        "section": session.section,
        "total_expected": total_expected,
        "checked_in_count": 0,
        "recent_checkins": []
    }

@router.get("/qr/token/{session_id}")
def rotate_dynamic_qr_token(
    session_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Teacher Portal (Polls every 10 seconds):
    Rotates the cryptographic QR token and returns live verified check-in stats.
    """
    if current_user and current_user.role == models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Students are not authorized to view teacher QR broadcast.")

    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Live academic session not found.")

    token = generate_dynamic_qr_jwt(session)

    # Fetch all students checked in so far
    present_logs = db.query(models.AttendanceLog, models.StudentProfile).join(
        models.StudentProfile, models.AttendanceLog.student_id == models.StudentProfile.id
    ).filter(
        models.AttendanceLog.session_id == session.id,
        models.AttendanceLog.is_present == True
    ).order_by(models.AttendanceLog.id.desc()).all()

    recent_checkins = [
        {
            "id": sp.id,
            "roll_number": sp.roll_number,
            "name": sp.full_name,
            "time": (log.timestamp or datetime.utcnow()).strftime("%I:%M:%S %p")
        } for log, sp in present_logs[:15]
    ]

    total_expected = db.query(models.StudentProfile).filter(
        models.StudentProfile.branch == session.branch,
        models.StudentProfile.semester == session.semester,
        models.StudentProfile.section == session.section
    ).count()

    return {
        "success": True,
        "session_id": session.id,
        "token": token,
        "expires_in": 10,
        "checked_in_count": len(present_logs),
        "total_expected": total_expected,
        "recent_checkins": recent_checkins
    }

@router.post("/qr/verify-and-mark")
def verify_and_mark_qr_attendance(
    payload: QRVerifyStudentRequest,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Student Portal:
    Scans the teacher's dynamic 10-second QR code.
    Verifies cryptographic signature, expiration, academic eligibility, and registers attendance.
    """
    if current_user and current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Only verified students can mark attendance via QR scan.")

    # 1. Decode & Verify Token Expiry (Strict 15s window prevents screenshots)
    try:
        decoded = jwt.decode(payload.token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=400, 
            detail="QR code has expired or is invalid! Please scan directly from the live faculty screen."
        )

    if decoded.get("type") != "dynamic_attendance_qr":
        raise HTTPException(status_code=400, detail="Unrecognized attendance QR token.")

    session_id = decoded.get("session_id")
    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Active lecture session not found or closed by faculty.")

    # 2. Resolve Student Profile (Self-healing & fallback support)
    student = None
    if current_user:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
        if not student:
            roll_candidate = current_user.email.split("@")[0].upper()
            student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll_candidate).first()
            if student:
                student.user_id = current_user.id
                db.commit()
                db.refresh(student)

    if not student and payload.student_roll:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == payload.student_roll.strip().upper()).first()

    if not student:
        raise HTTPException(status_code=401, detail="Student authentication required. Please log into the Student Portal before scanning.")

    # 3. Systematic Academic Isolation & Verification (HTTP 400 Bad Request to prevent client session wipes)
    # A. Check Semester
    if session.semester and student.semester and student.semester != session.semester:
        raise HTTPException(
            status_code=400, 
            detail=f"Academic mismatch: This lecture is designated for Semester {session.semester}, but you are registered in Semester {student.semester}."
        )

    # B. Check Section
    if session.section and student.section and student.section.upper() != session.section.upper():
        raise HTTPException(
            status_code=400,
            detail=f"Section mismatch: This lecture is for Section {session.section.upper()}, but you belong to Section {student.section.upper()}."
        )

    # C. Check Branch
    if session.branch and student.branch and not check_branch_compatibility(student.branch, session.branch):
        raise HTTPException(
            status_code=400,
            detail=f"Branch mismatch: This lecture belongs to {session.branch}, but your department is {student.branch}."
        )

    subj_name = session.custom_subject_name or (session.subject.name if session.subject else "Classroom Lecture")
    conductor = session.conducted_by_name or (session.teacher.full_name if session.teacher else "Faculty")

    # 4. Duplicate Check
    existing_log = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.session_id == session.id,
        models.AttendanceLog.student_id == student.id
    ).first()

    now_dt = datetime.utcnow()

    if existing_log and existing_log.is_present:
        log_time_str = (existing_log.timestamp or now_dt).strftime("%I:%M %p")
        return {
            "success": True,
            "already_marked": True,
            "status": "Verified",
            "message": f"Already checked in! Your presence was logged at {log_time_str}.",
            "subject_name": subj_name,
            "conducted_by": conductor,
            "marked_at": log_time_str
        }

    # 5. Mark Attendance
    if existing_log:
        existing_log.is_present = True
        existing_log.status_tag = "QR_VERIFIED"
        existing_log.remarks = f"Dynamic QR Verified (Faculty: {conductor})"
        existing_log.timestamp = now_dt
    else:
        new_log = models.AttendanceLog(
            session_id=session.id,
            student_id=student.id,
            is_present=True,
            status_tag="QR_VERIFIED",
            remarks=f"Dynamic QR Verified (Faculty: {conductor})",
            timestamp=now_dt
        )
        db.add(new_log)

    db.commit()

    return {
        "success": True,
        "already_marked": False,
        "status": "Present",
        "message": f"Attendance successfully verified for {subj_name}!",
        "subject_name": subj_name,
        "conducted_by": conductor,
        "marked_at": now_dt.strftime("%I:%M %p")
    }

@router.get("/qr/live-status/{session_id}")
def get_qr_live_status(
    session_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Teacher Portal Live Status Poller
    """
    if current_user and current_user.role == models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Faculty authorization required.")

    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    present_logs = db.query(models.AttendanceLog, models.StudentProfile).join(
        models.StudentProfile, models.AttendanceLog.student_id == models.StudentProfile.id
    ).filter(
        models.AttendanceLog.session_id == session.id,
        models.AttendanceLog.is_present == True
    ).order_by(models.AttendanceLog.id.desc()).all()

    total_expected = db.query(models.StudentProfile).filter(
        models.StudentProfile.branch == session.branch,
        models.StudentProfile.semester == session.semester,
        models.StudentProfile.section == session.section
    ).count()

    recent_checkins = [
        {
            "id": sp.id,
            "roll_number": sp.roll_number,
            "name": sp.full_name,
            "time": (log.timestamp or datetime.utcnow()).strftime("%I:%M:%S %p")
        } for log, sp in present_logs[:20]
    ]

    return {
        "session_id": session.id,
        "checked_in_count": len(present_logs),
        "total_expected": total_expected,
        "recent_checkins": recent_checkins
    }


