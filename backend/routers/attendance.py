from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

try:
    from .. import models, schemas, database
    from ..services.biometrics import compare_group_faces, verify_liveness
    from ..sort_utils import natural_sort_key
except (ImportError, ValueError):
    import models, schemas, database
    from services.biometrics import compare_group_faces, verify_liveness
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
from .auth import get_current_user

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
    
    # Process the group scan
    present_roll_numbers = compare_group_faces(image_bytes, known_vectors)
    present_roll_numbers = sorted(present_roll_numbers, key=natural_sort_key)
    
    # Mark attendance in database in sequential roll number order
    attendance_records = []
    for student in students:
        is_present = student.roll_number in present_roll_numbers
        
        # Anti-proxy safeguard: Check if attendance already marked
        existing_log = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == session_id,
            models.AttendanceLog.student_id == student.id
        ).first()
        
        if existing_log:
            # Update only if they were marked absent before and are now present
            if not existing_log.is_present and is_present:
                existing_log.is_present = True
        else:
            new_log = models.AttendanceLog(
                session_id=session_id,
                student_id=student.id,
                is_present=is_present
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
    Verifies liveness (anti-photo spoofing), matches face, and prevents duplicate scans.
    """
    if current_user.role != models.RoleEnum.teacher:
        raise HTTPException(status_code=403, detail="Only teachers can perform scans.")
        
    session = db.query(models.AcademicSession).filter(models.AcademicSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

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

    # 4. Check for duplicate scan within the current session
    existing_log = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.session_id == session_id,
        models.AttendanceLog.student_id == matched_student.id,
        models.AttendanceLog.is_present == True
    ).first()

    is_duplicate = existing_log is not None

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
    db: Session = Depends(database.get_db)
):
    """
    Returns student roster for the selected class/section for attendance marking.
    """
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
                "phone": s.phone,
                "has_face": bool(s.face_encoding)
            }
            for s in students
        ]
    }

@router.post("/create-and-submit")
def create_session_and_submit_attendance(
    payload: dict,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """
    Unified Teacher Classroom Submission:
    Allows ANY teacher to select:
    - Department / Branch
    - Year / Semester
    - Section
    - Subject (Regular) OR Guest Lecture / Special Session (with Custom Topic & Guest Conductor)
    - Conductor name (identifies who took the lecture: regular faculty, proxy, or guest speaker)
    - Session Notes (e.g. "Lecture 2 of the day", "Guest Lecture on Generative AI")
    - Submits attendance records in one seamless transaction.
    """
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

    # Find teacher profile if auth token or conductor name matches
    teacher_prof = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from jose import jwt
            import security
            token_data = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
            email = token_data.get("sub")
            if email:
                u = db.query(models.User).filter(models.User.email == email).first()
                if u and u.teacher_profile:
                    teacher_prof = u.teacher_profile
        except Exception:
            pass

    if not teacher_prof and conducted_by_name:
        teacher_prof = db.query(models.TeacherProfile).filter(
            models.TeacherProfile.full_name.ilike(f"%{conducted_by_name}%")
        ).first()

    if not teacher_prof:
        teacher_prof = db.query(models.TeacherProfile).first()

    conductor_final = conducted_by_name or (teacher_prof.full_name if teacher_prof else "Faculty Coordinator")

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
    db: Session = Depends(database.get_db)
):
    """
    Review Screen: Teacher submits the final reviewed and adjusted attendance roster.
    Supports both facial scan and manual additions/removals, along with conductor and guest lecture metadata.
    """
    # Authenticate teacher via header or fallback to default faculty
    teacher_user = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from jose import jwt
            import security
            token_data = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
            email = token_data.get("sub")
            if email:
                teacher_user = db.query(models.User).filter(models.User.email == email).first()
        except Exception:
            pass

    if not teacher_user:
        teacher_user = db.query(models.User).filter(models.User.role == models.RoleEnum.teacher).first()

    # Update session metadata if provided
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
            models.AttendanceLog.session_id == session_id,
            models.AttendanceLog.student_id == student_id
        ).first()
        if log:
            log.is_present = is_pres
            log.status_tag = tag
        else:
            db.add(models.AttendanceLog(session_id=session_id, student_id=student_id, is_present=is_pres, status_tag=tag))

    # Audit Log
    user_id = teacher_user.id if teacher_user else 1
    client_host = request.client.host if request.client else "127.0.0.1"
    conductor_name = session.conducted_by_name if (session and session.conducted_by_name) else "Faculty"
    db.add(models.AuditLog(
        user_id=user_id,
        action=f"Teacher ({conductor_name}) finalized attendance for session {session_id}: {len(present_ids)} present, {len(absent_ids)} absent.",
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

