from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional, List
from pydantic import BaseModel

try:
    from .. import models, schemas, database, security
except (ImportError, ValueError):
    import models, schemas, database, security
from .auth import get_current_user
try:
    from ..academic_config import resolve_program_meta, calculate_attendance_ia_marks
except (ImportError, ValueError):
    try:
        from academic_config import resolve_program_meta, calculate_attendance_ia_marks
    except (ImportError, ValueError):
        def resolve_program_meta(branch=None, db=None):
            return {"duration_years": 4, "total_semesters": 8}
        def calculate_attendance_ia_marks(attendance_pct):
            return {
                "attendance_percentage": attendance_pct,
                "ia_marks": 5 if attendance_pct >= 90 else (2 if attendance_pct >= 75 else 0),
                "max_ia_marks": 5,
                "standing": "Good Standing" if attendance_pct >= 75 else "Debarment Risk",
                "color": "emerald" if attendance_pct >= 75 else "rose",
                "tier": "GREEN" if attendance_pct >= 75 else "RED",
                "condonation_eligible": 65.0 <= attendance_pct < 75.0,
                "debarment_risk": attendance_pct < 65.0,
                "description": ""
            }
try:
    from ..time_utils import now_ist_naive, today_ist_str, format_time_ist
except (ImportError, ValueError):
    try:
        from time_utils import now_ist_naive, today_ist_str, format_time_ist
    except (ImportError, ValueError):
        from datetime import timezone, timedelta
        _IST = timezone(timedelta(hours=5, minutes=30))
        def now_ist_naive(): return datetime.now(_IST).replace(tzinfo=None)
        def today_ist_str(): return datetime.now(_IST).strftime("%Y-%m-%d")
        def format_time_ist(dt=None, fmt="%I:%M %p"): return (dt or now_ist_naive()).strftime(fmt)

router = APIRouter(
    prefix="/portal",
    tags=["Student Self-Service Portal"]
)

def get_year_details(semester: int, branch: Optional[str] = None):
    sem = semester if semester and semester > 0 else 1
    year_num = (sem + 1) // 2
    prog_meta = resolve_program_meta(branch)
    total_years = prog_meta.get("duration_years", 4)
    total_sems = prog_meta.get("total_semesters", total_years * 2)

    ordinals = {1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year", 5: "5th Year", 6: "6th Year"}
    year_label = ordinals.get(year_num, f"{year_num}th Year")

    if sem > total_sems:
        stage = "Graduated Alumni"
    elif year_num >= total_years:
        stage = f"{year_label} (Final Year - Graduating Cohort)"
    elif year_num == total_years - 1:
        stage = f"{year_label} (Pre-Final Year)"
    else:
        stage = f"{year_label}"

    return {
        "academic_year": year_num,
        "academic_year_label": f"{year_label} (Semester {sem})",
        "year_name": year_label,
        "stage": stage,
        "semester": sem,
        "total_years": total_years,
        "total_semesters": total_sems
    }

@router.get("/metrics")
def get_student_metrics(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    # Strict RBAC Ownership: Link strictly by authenticated user_id (Zero Hijacking Vector)
    student = current_user.student_profile or db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not linked to this authenticated account. Contact university administration."
        )

    year_info = get_year_details(student.semester, student.branch)
        
    # Get all logs for this student
    logs_query = db.query(models.AttendanceLog, models.AcademicSession).join(
        models.AcademicSession, models.AttendanceLog.session_id == models.AcademicSession.id
    ).options(
        joinedload(models.AcademicSession.teacher),
        joinedload(models.AcademicSession.subject)
    ).filter(
        models.AttendanceLog.student_id == student.id
    ).order_by(models.AcademicSession.start_time.desc()).all()

    total_classes = len(logs_query)
    attended_classes = sum(1 for log, sess in logs_query if log.is_present)
    absent_classes = total_classes - attended_classes
    overall_percentage = round((attended_classes / total_classes * 100), 1) if total_classes > 0 else 0.0

    # Mathematical exact rest/bunk and recovery calculations (75% mandatory university cutoff)
    if overall_percentage >= 75.0 and total_classes > 0:
        safe_bunk_margin = max(0, int((attended_classes - 0.75 * total_classes) // 0.75))
        recovery_goal = 0
    elif total_classes > 0:
        safe_bunk_margin = 0
        recovery_goal = max(0, 3 * total_classes - 4 * attended_classes)
    else:
        safe_bunk_margin = 0
        recovery_goal = 0

    today_str = today_ist_str()
    today_holiday = db.query(models.Holiday).filter(models.Holiday.date == today_str).first()
    upcoming_holidays = db.query(models.Holiday).filter(models.Holiday.date >= today_str).order_by(models.Holiday.date.asc()).limit(5).all()

    # 1. Day-Wise Attendance Grouping
    day_groups = defaultdict(list)
    for log, sess in logs_query:
        dt = sess.start_time or log.timestamp or now_ist_naive()
        date_str = dt.strftime("%Y-%m-%d")
        time_str = dt.strftime("%I:%M %p")
        if sess.end_time:
            time_str += f" - {sess.end_time.strftime('%I:%M %p')}"

        is_guest = sess.session_type == models.SessionType.guest_lecture
        subj_name = sess.custom_subject_name or (sess.subject.name if sess.subject else ("Special Guest Lecture" if is_guest else "Classroom Session"))
        subj_code = sess.subject.code if sess.subject else ("GUEST-LEC" if is_guest else "CORE-01")
        conductor = sess.conducted_by_name or (sess.teacher.full_name if sess.teacher else "Faculty Coordinator")

        day_groups[date_str].append({
            "log_id": log.id,
            "session_id": sess.id,
            "time": time_str,
            "subject_code": subj_code,
            "subject_name": subj_name,
            "is_guest_lecture": is_guest,
            "conducted_by": conductor,
            "session_type": sess.session_type.value if hasattr(sess.session_type, 'value') else str(sess.session_type),
            "notes": sess.notes,
            "is_present": log.is_present,
            "status": "Present" if log.is_present else "Absent",
            "status_tag": log.status_tag or ("PRESENT" if log.is_present else "ABSENT"),
            "remarks": log.remarks
        })

    day_wise = []
    for d_str in sorted(day_groups.keys(), reverse=True):
        sess_list = day_groups[d_str]
        d_total = len(sess_list)
        d_present = sum(1 for s in sess_list if s["is_present"])
        d_pct = round(d_present / d_total * 100, 1) if d_total > 0 else 0.0
        dt_obj = datetime.strptime(d_str, "%Y-%m-%d")

        day_wise.append({
            "date": d_str,
            "formatted_date": dt_obj.strftime("%d %b %Y"),
            "day_name": dt_obj.strftime("%A"),
            "total_lectures": d_total,
            "attended_lectures": d_present,
            "absent_lectures": d_total - d_present,
            "turnout_pct": d_pct,
            "sessions": sess_list
        })

    # 2. Subject-Wise Breakdown
    subjects_db = db.query(models.Subject).filter(models.Subject.branch.ilike(f"%{student.branch}%")).all()
    if student.semester:
        sem_subs = [s for s in subjects_db if s.semester == student.semester]
        if sem_subs:
            subjects_db = sem_subs

    subject_wise = []
    accounted_session_ids = set()

    for subj in subjects_db:
        subj_logs = [(l, sess) for l, sess in logs_query if sess.subject_id == subj.id]
        s_total = len(subj_logs)
        s_present = sum(1 for l, sess in subj_logs if l.is_present)
        s_pct = round(s_present / s_total * 100, 1) if s_total > 0 else 0.0

        for l, sess in subj_logs:
            accounted_session_ids.add(sess.id)

        conductors = list({
            sess.conducted_by_name or (sess.teacher.full_name if sess.teacher else "Faculty Coordinator")
            for l, sess in logs_query if sess.subject_id == subj.id
        })

        subject_wise.append({
            "code": subj.code,
            "name": subj.name,
            "semester": subj.semester,
            "total": s_total,
            "attended": s_present,
            "absent": s_total - s_present,
            "pct": s_pct,
            "is_safe": s_pct >= 75.0,
            "teachers": conductors
        })

    # Include any custom/unregistered sessions attended by student
    custom_sessions_map = {}
    for l, sess in logs_query:
        if sess.id not in accounted_session_ids:
            s_name = sess.custom_subject_name or "Classroom Session"
            if s_name not in custom_sessions_map:
                custom_sessions_map[s_name] = []
            custom_sessions_map[s_name].append((l, sess))

    for idx, (s_name, s_pairs) in enumerate(custom_sessions_map.items()):
        s_total = len(s_pairs)
        s_present = sum(1 for l, sess in s_pairs if l.is_present)
        s_pct = round(s_present / s_total * 100, 1) if s_total > 0 else 0.0
        conductors = list({sess.conducted_by_name or (sess.teacher.full_name if sess.teacher else "Faculty Coordinator") for l, sess in s_pairs})
        code_prefix = "".join(w[0] for w in s_name.split() if w).upper()[:4] or "CORE"
        subject_wise.append({
            "code": f"{code_prefix}-{idx+1:02d}",
            "name": s_name,
            "semester": student.semester or 1,
            "total": s_total,
            "attended": s_present,
            "absent": s_total - s_present,
            "pct": s_pct,
            "is_safe": s_pct >= 75.0,
            "teachers": conductors
        })

    # 3. Guest Lectures Summary
    guest_logs = [(l, sess) for l, sess in logs_query if sess.session_type == models.SessionType.guest_lecture]
    g_total = len(guest_logs)
    g_present = sum(1 for l, sess in guest_logs if l.is_present)
    g_pct = round(g_present / g_total * 100, 1) if g_total > 0 else 0.0
    guest_summary = {
        "total": g_total,
        "attended": g_present,
        "absent": g_total - g_present,
        "pct": g_pct,
        "topics": [
            {
                "topic": sess.custom_subject_name or "Special Guest Lecture",
                "conducted_by": sess.conducted_by_name or "Guest Speaker",
                "date": (sess.start_time or now_ist_naive()).strftime("%Y-%m-%d"),
                "is_present": l.is_present
            }
            for l, sess in guest_logs
        ]
    }

    # 4. Recent Raw Logs (last 15)
    logs_data = []
    for log, sess in logs_query[:15]:
        dt = sess.start_time or log.timestamp or now_ist_naive()
        is_guest = sess.session_type == models.SessionType.guest_lecture
        subj_name = sess.custom_subject_name or (sess.subject.name if sess.subject else ("Special Guest Lecture" if is_guest else "Classroom Session"))
        conductor = sess.conducted_by_name or (sess.teacher.full_name if sess.teacher else "Faculty Coordinator")
        logs_data.append({
            "id": log.id,
            "session_id": sess.id,
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%I:%M %p"),
            "subject": subj_name,
            "conducted_by": conductor,
            "session_type": sess.session_type.value if hasattr(sess.session_type, 'value') else str(sess.session_type),
            "status": "Present" if log.is_present else "Absent",
            "status_tag": log.status_tag or ("PRESENT" if log.is_present else "ABSENT"),
            "confidence": f"{round(log.confidence_score, 1)}%" if (log.is_present and log.confidence_score is not None) else ("100.0%" if log.is_present else "No Match"),
            "remarks": log.remarks
        })

    # Real database subjects only - zero hardcoded fallback demo data
    # (Empty list if no subjects or classes configured yet)
        
    return {
        "profile": {
            "name": student.full_name,
            "roll_number": student.roll_number,
            "semester": student.semester or 1,
            "academic_year": year_info["academic_year"],
            "academic_year_label": year_info["academic_year_label"],
            "year_name": year_info["year_name"],
            "stage": year_info["stage"],
            "section": student.section or "A",
            "photo_thumbnail": student.photo_thumbnail,
            "branch": student.branch or "Academic Department",
            "sub_batch": student.sub_batch or "A1",
            "mentor_name": student.mentor_name or "Faculty Mentor",
            "parent_contact": student.emergency_contact or student.phone or student.parent_email or "None",
            "parent_email": student.parent_email if student.parent_email and student.parent_email.strip() else "None",
            "parent_phone": student.emergency_contact or student.phone or "None"
        },
        "metrics": {
            "overall_percentage": overall_percentage,
            "total_classes": total_classes,
            "attended_classes": attended_classes,
            "absent_classes": absent_classes,
            "safe_bunk_margin": safe_bunk_margin,
            "recovery_goal": recovery_goal,
            "eligibility_status": "Eligible" if overall_percentage >= 75.0 else ("Defaulter Risk" if total_classes > 0 else "New Semester"),
            "ia_marks": calculate_attendance_ia_marks(overall_percentage)["ia_marks"],
            "ia_max": 5,
            "standing": calculate_attendance_ia_marks(overall_percentage)["standing"],
            "standing_tier": calculate_attendance_ia_marks(overall_percentage)["tier"],
            "condonation_eligible": calculate_attendance_ia_marks(overall_percentage)["condonation_eligible"],
            "debarment_risk": calculate_attendance_ia_marks(overall_percentage)["debarment_risk"],
            "is_holiday_today": bool(today_holiday),
            "today_holiday": {
                "title": today_holiday.title,
                "description": today_holiday.description,
                "date": today_holiday.date,
                "end_date": getattr(today_holiday, 'end_date', None),
                "event_type": getattr(today_holiday, 'event_type', 'HOLIDAY')
            } if today_holiday else None
        },
        "upcoming_holidays": [
            {
                "id": h.id,
                "title": h.title,
                "date": h.date,
                "description": h.description,
                "department": h.department
            }
            for h in upcoming_holidays
        ],
        "subjects": subject_wise,
        "guest_lectures": guest_summary,
        "day_wise": day_wise,
        "recent_logs": logs_data
    }

class GrievanceSubmission(BaseModel):
    session_id: Optional[int] = None
    reason: Optional[str] = None
    subject_name: Optional[str] = None
    document_url: Optional[str] = None
    document_name: Optional[str] = None

@router.post("/grievances")
@router.post("/grievance", include_in_schema=False)
def submit_grievance(
    payload: Optional[GrievanceSubmission] = None,
    session_id: Optional[int] = None,
    reason: Optional[str] = None,
    subject_name: Optional[str] = None,
    document_url: Optional[str] = None,
    document_name: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    final_session_id = (payload.session_id if payload and payload.session_id is not None else session_id) or 1
    final_reason = (payload.reason if payload and payload.reason else reason) or "Absence recorded in error"
    final_subject_name = payload.subject_name if payload and payload.subject_name else subject_name
    final_doc_url = payload.document_url if payload and payload.document_url else document_url
    final_doc_name = payload.document_name if payload and payload.document_name else document_name

    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found for this account.")

    import uuid
    ticket_id = f"GRV-{uuid.uuid4().hex[:8].upper()}"
    
    # Resolve real subject name from session if available
    resolved_subject = final_subject_name
    sess = db.query(models.AcademicSession).filter(models.AcademicSession.id == final_session_id).first()
    if sess:
        if sess.custom_subject_name:
            resolved_subject = sess.custom_subject_name
        elif sess.subject:
            resolved_subject = sess.subject.name
    if not resolved_subject:
        resolved_subject = "General Academic Session"
        
    grievance = models.Grievance(
        ticket_id=ticket_id,
        student_id=student.id if student else None,
        session_id=final_session_id,
        subject_name=resolved_subject,
        reason=final_reason,
        document_url=final_doc_url,
        document_name=final_doc_name,
        status="Pending HOD Decision"
    )
    db.add(grievance)
    db.commit()
    db.refresh(grievance)

    # Real audit log so HOD can see this genuine submission
    try:
        st_name = student.full_name if student else "Student"
        st_roll = student.roll_number if student else (current_user.email or "Student")
        audit = models.AuditLog(
            action=f"Student ({st_name}, {st_roll}) lodged attendance dispute {ticket_id} for {resolved_subject}.",
            user_id=current_user.id,
            timestamp=now_ist_naive()
        )
        db.add(audit)
        db.commit()

        # Real-time Push Notification to HOD
        try:
            try:
                from ..services.push_notification_service import notify_role
            except (ImportError, ValueError):
                from services.push_notification_service import notify_role
            notify_role(
                db=db,
                role=models.RoleEnum.hod,
                title="New Student Grievance Filed",
                body=f"{st_name} ({st_roll}) lodged dispute for {resolved_subject} [#{ticket_id}]",
                data={"ticket_id": ticket_id, "type": "NEW_GRIEVANCE"}
            )
        except Exception:
            pass
    except Exception as e:
        print("Audit log error:", e)
    
    return {
        "success": True,
        "message": f"Grievance {ticket_id} for {resolved_subject} lodged successfully. It has been routed to your HOD for formal verification.",
        "ticket_id": ticket_id
    }

@router.get("/grievances")
def get_student_grievances(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        roll_prefix = (current_user.email or "").split('@')[0].strip().upper()
        student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number.ilike(roll_prefix)).first()
        if student and student.user_id and student.user_id != current_user.id:
            student = None
    if not student:
        return []
    records = db.query(models.Grievance).filter(models.Grievance.student_id == student.id).order_by(models.Grievance.created_at.desc()).all()
    return [{
        "id": g.ticket_id,
        "date": g.created_at.strftime("%Y-%m-%d"),
        "subject": g.subject_name,
        "reason": g.reason,
        "document_url": g.document_url,
        "document_name": g.document_name,
        "status": g.status
    } for g in records]

@router.get("/profile")
def get_student_profile(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    # Strict RBAC Ownership: Link strictly by authenticated user_id (Zero Hijacking Vector)
    student = current_user.student_profile or db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not linked to this authenticated account. Contact university administration."
        )
        
    year_info = get_year_details(student.semester, student.branch)

    # Calculate live attendance standing and telemetry for this student
    logs_query = db.query(models.AttendanceLog, models.AcademicSession).join(
        models.AcademicSession, models.AttendanceLog.session_id == models.AcademicSession.id
    ).filter(
        models.AttendanceLog.student_id == student.id
    ).order_by(models.AcademicSession.start_time.desc()).all()

    total_classes = len(logs_query)
    attended_classes = sum(1 for log, sess in logs_query if log.is_present)
    absent_classes = total_classes - attended_classes
    overall_percentage = round((attended_classes / total_classes * 100), 1) if total_classes > 0 else 0.0
    is_defaulter = overall_percentage < 75.0 if total_classes > 0 else False
    eligibility_status = "Exam Eligible" if overall_percentage >= 75.0 else ("Defaulter Warning" if total_classes > 0 else "New Enrollee")

    # Classes needed to reach 75% threshold
    classes_needed = 0
    if is_defaulter:
        # formula: (attended + x) / (total + x) >= 0.75  =>  x >= 3*total - 4*attended
        classes_needed = max(0, 3 * total_classes - 4 * attended_classes)

    # Subject-wise attendance breakdown
    subjects_db = db.query(models.Subject).filter(
        models.Subject.branch.ilike(f"%{student.branch}%"),
        models.Subject.semester == student.semester
    ).all()

    subject_wise = []
    for subj in subjects_db:
        subj_logs = [l for l, sess in logs_query if sess.subject_id == subj.id]
        s_total = len(subj_logs)
        s_present = sum(1 for l in subj_logs if l.is_present)
        s_pct = round(s_present / s_total * 100, 1) if s_total > 0 else 0.0

        conductors = list({
            sess.conducted_by_name or (sess.teacher.full_name if sess.teacher else "Faculty Coordinator")
            for l, sess in logs_query if sess.subject_id == subj.id
        })

        subject_wise.append({
            "code": subj.code,
            "name": subj.name,
            "semester": subj.semester,
            "total": s_total,
            "attended": s_present,
            "absent": s_total - s_present,
            "pct": s_pct,
            "is_safe": s_pct >= 75.0,
            "teachers": conductors
        })

    # Recent raw logs (up to 10)
    recent_logs = []
    for log, sess in logs_query[:10]:
        dt = sess.start_time or log.timestamp or now_ist_naive()
        is_guest = sess.session_type == models.SessionType.guest_lecture
        subj_name = sess.custom_subject_name or (sess.subject.name if sess.subject else ("Special Guest Lecture" if is_guest else "Classroom Session"))
        conductor = sess.conducted_by_name or (sess.teacher.full_name if sess.teacher else "Faculty Coordinator")
        recent_logs.append({
            "id": log.id,
            "session_id": sess.id,
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%I:%M %p"),
            "subject": subj_name,
            "conducted_by": conductor,
            "is_present": log.is_present,
            "status": "Present" if log.is_present else "Absent",
            "status_tag": log.status_tag or ("PRESENT" if log.is_present else "ABSENT")
        })

    ia_info = calculate_attendance_ia_marks(overall_percentage)
    return {
        "full_name": student.full_name,
        "roll_number": student.roll_number,
        "branch": student.branch or "Academic Department",
        "semester": student.semester or 1,
        "academic_year": year_info["academic_year"],
        "academic_year_label": year_info["academic_year_label"],
        "year_name": year_info["year_name"],
        "stage": year_info["stage"],
        "section": student.section or "A",
        "email": current_user.email,
        "phone": student.phone if student.phone and student.phone.strip() else "None",
        "emergency_contact": student.emergency_contact if student.emergency_contact and student.emergency_contact.strip() else "None",
        "parent_email": student.parent_email if student.parent_email and student.parent_email.strip() else "None",
        "parent_contact": student.emergency_contact or student.phone or student.parent_email or "None",
        "sub_batch": student.sub_batch or "A1",
        "mentor_name": student.mentor_name or "Faculty Mentor",
        "has_face_enrolled": bool(student.face_encoding),
        "photo_thumbnail": student.photo_thumbnail,
        "is_active": current_user.is_active,
        # Live Attendance Details & IA Marks Weightage
        "overall_percentage": overall_percentage,
        "total_classes": total_classes,
        "attended_classes": attended_classes,
        "absent_classes": absent_classes,
        "is_defaulter": is_defaulter,
        "eligibility_status": eligibility_status,
        "classes_needed": classes_needed,
        "ia_marks": ia_info["ia_marks"],
        "ia_max": 5,
        "standing": ia_info["standing"],
        "condonation_eligible": ia_info["condonation_eligible"],
        "debarment_risk": ia_info["debarment_risk"],
        "subject_wise": subject_wise,
        "recent_logs": recent_logs
    }

@router.put("/profile")
def update_student_profile(
    payload: schemas.StudentProfileUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    updated_fields = []

    # Update Full Name if changed
    if payload.full_name and payload.full_name.strip():
        student.full_name = payload.full_name.strip()
        updated_fields.append("full_name")
    
    # Update Email if changed
    if payload.email and payload.email.strip() and payload.email.strip().lower() != current_user.email.lower():
        new_email = payload.email.strip().lower()
        existing_user = db.query(models.User).filter(models.User.email == new_email).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="This email address is already in use.")
        current_user.email = new_email
        updated_fields.append("email")
        
    # Update Phone
    if payload.phone is not None:
        student.phone = payload.phone.strip()
        updated_fields.append("phone")
        
    # Update Emergency Contact
    if payload.emergency_contact is not None:
        student.emergency_contact = payload.emergency_contact.strip()
        updated_fields.append("emergency_contact")
        
    # Update Password if requested
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to establish a new account password.")
        if not security.verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="The current password provided is incorrect.")
        if len(payload.new_password.strip()) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")
        
        current_user.hashed_password = security.get_password_hash(payload.new_password.strip())
        updated_fields.append("password")
        
    db.commit()
    db.refresh(current_user)
    db.refresh(student)
    
    return {
        "success": True,
        "message": f"Profile updated successfully ({', '.join(updated_fields) if updated_fields else 'no changes'}).",
        "profile": {
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "branch": student.branch,
            "semester": student.semester,
            "section": student.section,
            "email": current_user.email,
            "phone": student.phone or "",
            "emergency_contact": student.emergency_contact or "",
            "has_face_enrolled": bool(student.face_encoding),
            "photo_thumbnail": student.photo_thumbnail
        }
    }

@router.get("/notifications")
def get_student_live_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    STRICT PRIVACY & ROLE ISOLATION:
    Returns ONLY real notifications intended exclusively for THIS logged-in student:
    1. Student's own attendance updates (marked Present/Absent in recent sessions).
    2. Student's own grievance status changes / approvals from HOD.
    3. Official College / Branch holidays.
    4. Personal Defaulter Alert if cumulative attendance is < 75% in any subject.
    Never returns other students' grievances, personal data, or unrelated faculty logs.
    """
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Student authorization required.")

    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        roll_prefix = (current_user.email or "").split('@')[0].strip().upper()
        student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number.ilike(roll_prefix)).first()
        if student and student.user_id and student.user_id != current_user.id:
            student = None

    if not student:
        return []

    notifications = []
    now = now_ist_naive()
    one_day_ago = now - timedelta(hours=24)

    # 1. Student's own attendance records from the last 24 hours
    recent_logs = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.student_id == student.id,
        models.AttendanceLog.timestamp >= one_day_ago
    ).order_by(models.AttendanceLog.timestamp.desc()).limit(5).all()

    session_ids = [l.session_id for l in recent_logs if l.session_id]
    sessions_map = {}
    if session_ids:
        sessions = db.query(models.AcademicSession).filter(models.AcademicSession.id.in_(session_ids)).all()
        sessions_map = {s.id: s for s in sessions}

    for l in recent_logs:
        sess = sessions_map.get(l.session_id)
        subj_name = sess.subject.name if (sess and sess.subject) else (sess.custom_subject_name if sess else "Class Lecture")
        status_str = "Present" if l.is_present else "Absent"
        notifications.append({
            "id": f"att-{l.id}",
            "type": "attendance_submission" if l.is_present else "grievance_alert",
            "title": f"Attendance Marked: {status_str}",
            "detail": f"You were marked {status_str} in {subj_name}",
            "time": l.timestamp.strftime("%I:%M %p") if l.timestamp else "Today",
            "raw_time": l.timestamp.isoformat() if l.timestamp else now.isoformat(),
            "badge": "Verified Present" if l.is_present else "Marked Absent"
        })

    # 2. Student's own grievances (recent updates / pending / decisions)
    my_grievances = db.query(models.Grievance).filter(
        models.Grievance.student_id == student.id
    ).order_by(models.Grievance.created_at.desc()).limit(3).all()

    for g in my_grievances:
        is_resolved = "Granted" in (g.status or "") or "Approved" in (g.status or "") or "Rejected" in (g.status or "")
        notifications.append({
            "id": f"grv-{g.id}",
            "type": "grievance_alert",
            "title": "Dispute Decision" if is_resolved else "Grievance Under Review",
            "detail": f"Ticket {g.ticket_id} ({g.subject_name}): Status is '{g.status}'",
            "time": g.created_at.strftime("%d %b") if g.created_at else "Recent",
            "raw_time": g.created_at.isoformat() if g.created_at else now.isoformat(),
            "badge": g.status
        })

    # 3. Institutional Holidays applicable to student's department or college
    student_branch = student.branch or ""
    today_str = now.strftime("%Y-%m-%d")
    holidays = db.query(models.Holiday).filter(models.Holiday.date >= today_str).order_by(models.Holiday.date.asc()).limit(2).all()
    for h in holidays:
        if h.department == "all" or student_branch.lower() in (h.department or "").lower():
            notifications.append({
                "id": f"hol-{h.id}",
                "type": "holiday_alert",
                "title": "College Holiday Notice",
                "detail": f"{h.title} scheduled on {h.date} - Classes suspended",
                "time": h.date,
                "raw_time": now.isoformat(),
                "badge": "Holiday"
            })

    # 4. Personal Defaulter / Low Attendance Alert (<75%)
    log_stats = db.query(
        func.count(models.AttendanceLog.id),
        func.sum(case((models.AttendanceLog.is_present == True, 1), else_=0))
    ).filter(models.AttendanceLog.student_id == student.id).first()
    total_logs = log_stats[0] if log_stats else 0
    present_count = int(log_stats[1] or 0) if (log_stats and log_stats[1] is not None) else 0
    if total_logs > 0:
        pct = round((present_count / total_logs) * 100, 1)
        if pct < 75.0:
            notifications.append({
                "id": f"defaulter-{student.id}",
                "type": "parent_alert",
                "title": "Attendance Warning (<75%)",
                "detail": f"Your cumulative attendance is {pct}%, below the mandatory 75% university criteria.",
                "time": "Academic Warning",
                "raw_time": now.isoformat(),
                "badge": f"{pct}% Critical"
            })

    return notifications
