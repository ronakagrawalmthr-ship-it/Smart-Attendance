from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from collections import defaultdict

try:
    from .. import models, schemas, database, security
except (ImportError, ValueError):
    import models, schemas, database, security
from .auth import get_current_user

router = APIRouter(
    prefix="/portal",
    tags=["Student Self-Service Portal"]
)

def get_year_details(semester: int):
    sem = semester if semester and semester > 0 else 1
    year_num = (sem + 1) // 2
    ordinals = {1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year"}
    year_label = ordinals.get(year_num, f"Year {year_num}")
    if year_num == 4:
        stage = "Final Year (Graduating Batch)"
    elif year_num == 3:
        stage = "3rd Year (Junior Batch)"
    elif year_num == 2:
        stage = "2nd Year (Sophomore Batch)"
    else:
        stage = "1st Year (Freshman Batch)"
    return {
        "academic_year": year_num,
        "academic_year_label": f"{year_label} (Semester {sem})",
        "year_name": year_label,
        "stage": stage,
        "semester": sem
    }

@router.get("/metrics")
def get_student_metrics(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    year_info = get_year_details(student.semester)
        
    # Get all logs for this student
    logs_query = db.query(models.AttendanceLog, models.AcademicSession).join(
        models.AcademicSession, models.AttendanceLog.session_id == models.AcademicSession.id
    ).filter(
        models.AttendanceLog.student_id == student.id
    ).order_by(models.AcademicSession.start_time.desc()).all()

    total_classes = len(logs_query)
    attended_classes = sum(1 for log, sess in logs_query if log.is_present)
    absent_classes = total_classes - attended_classes
    overall_percentage = round((attended_classes / total_classes * 100), 1) if total_classes > 0 else 0.0

    # 1. Day-Wise Attendance Grouping
    day_groups = defaultdict(list)
    for log, sess in logs_query:
        dt = sess.start_time or log.timestamp or datetime.utcnow()
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
                "date": (sess.start_time or datetime.utcnow()).strftime("%Y-%m-%d"),
                "is_present": l.is_present
            }
            for l, sess in guest_logs
        ]
    }

    # 4. Recent Raw Logs (last 15)
    logs_data = []
    for log, sess in logs_query[:15]:
        dt = sess.start_time or log.timestamp or datetime.utcnow()
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
            "remarks": log.remarks
        })

    # Fallback demo subjects if no classes conducted yet
    if not subject_wise and total_classes == 0:
        subject_wise = [
            { "code": "CS801", "name": "Deep Learning & Neural Networks", "total": 0, "attended": 0, "absent": 0, "pct": 100.0, "is_safe": True, "teachers": [] },
            { "code": "CS802", "name": "Distributed Cloud Systems", "total": 0, "attended": 0, "absent": 0, "pct": 100.0, "is_safe": True, "teachers": [] },
            { "code": "CS803", "name": "Cybersecurity & Blockchain", "total": 0, "attended": 0, "absent": 0, "pct": 100.0, "is_safe": True, "teachers": [] }
        ]
        
    return {
        "profile": {
            "name": student.full_name,
            "roll_number": student.roll_number,
            "semester": student.semester or 1,
            "academic_year": year_info["academic_year"],
            "academic_year_label": year_info["academic_year_label"],
            "year_name": year_info["year_name"],
            "stage": year_info["stage"],
            "branch": student.branch or "Computer Science"
        },
        "metrics": {
            "overall_percentage": overall_percentage,
            "total_classes": total_classes,
            "attended_classes": attended_classes,
            "absent_classes": absent_classes,
            "eligibility_status": "Eligible" if overall_percentage >= 75.0 else ("Defaulter Risk" if total_classes > 0 else "New Semester")
        },
        "subjects": subject_wise,
        "guest_lectures": guest_summary,
        "day_wise": day_wise,
        "recent_logs": logs_data
    }

import random

@router.post("/grievance")
def submit_grievance(
    session_id: int,
    reason: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    ticket_id = f"GRV-{random.randint(100, 999)}"
    
    grievance = models.Grievance(
        ticket_id=ticket_id,
        student_id=student.id if student else None,
        session_id=session_id,
        subject_name="Computer Networks",
        reason=reason,
        status="Pending HOD Decision"
    )
    db.add(grievance)
    db.commit()
    db.refresh(grievance)
    
    return {
        "success": True,
        "message": f"Grievance {ticket_id} lodged successfully. It has been routed to your HOD for formal verification.",
        "ticket_id": ticket_id
    }

@router.get("/grievances")
def get_student_grievances(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        return []
    records = db.query(models.Grievance).filter(models.Grievance.student_id == student.id).order_by(models.Grievance.created_at.desc()).all()
    return [{
        "id": g.ticket_id,
        "date": g.created_at.strftime("%Y-%m-%d"),
        "subject": g.subject_name,
        "reason": g.reason,
        "status": g.status
    } for g in records]

@router.get("/profile")
def get_student_profile(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    year_info = get_year_details(student.semester)
    return {
        "full_name": student.full_name,
        "roll_number": student.roll_number,
        "branch": student.branch or "Computer Science",
        "semester": student.semester or 1,
        "academic_year": year_info["academic_year"],
        "academic_year_label": year_info["academic_year_label"],
        "year_name": year_info["year_name"],
        "stage": year_info["stage"],
        "section": student.section or "A",
        "email": current_user.email,
        "phone": student.phone or "",
        "emergency_contact": student.emergency_contact or "",
        "has_face_enrolled": bool(student.face_encoding),
        "is_active": current_user.is_active
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
        if len(payload.new_password.strip()) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
        
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
            "has_face_enrolled": bool(student.face_encoding)
        }
    }
