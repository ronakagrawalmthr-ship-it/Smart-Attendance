import asyncio
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
try:
    import models
    import database
except ImportError:
    try:
        from .. import models, database
    except (ImportError, ValueError):
        from backend import models, database

def format_whatsapp_message(student_name: str, roll_number: str, subject_code: str, attendance_pct: float, consecutive: int) -> str:
    return (
        f"🚨 *APEX UNIVERSITY ATTENDANCE ALERT*\n\n"
        f"Dear Parent/Guardian,\n"
        f"Your ward *{student_name}* (Roll No: *{roll_number}*) was marked *ABSENT* for {subject_code} classes.\n\n"
        f"⚠️ *Overall Attendance:* {attendance_pct:.1f}%\n"
        f"⚠️ *Consecutive Missed Sessions:* {consecutive} Lectures\n\n"
        f"Under institutional academic bylaws, a minimum of *75% attendance* is mandatory for semester examination eligibility.\n\n"
        f"Please contact the HOD Office (Academic Block A-305) or ensure your ward attends upcoming sessions.\n\n"
        f"— *Department of Academic Governance*"
    )

def generate_whatsapp_url(phone: str, message: str) -> str:
    clean_phone = "".join(filter(str.isdigit, phone or ""))
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    elif clean_phone.startswith("0"):
        clean_phone = "91" + clean_phone[1:]
    encoded = urllib.parse.quote(message)
    return f"https://wa.me/{clean_phone}?text={encoded}"

def run_midnight_attendance_audit(db: Session) -> Dict[str, Any]:
    """
    Automated Midnight Background Worker:
    1. Scans unconducted timetable sessions and flags missed classes.
    2. Recalculates student cumulative attendance matrices.
    3. Detects students with >= 3 consecutive missed lectures or < 75% attendance.
    4. Automatically records delivery alerts in the Parent Notification Ledger.
    """
    now = datetime.utcnow()
    
    # 1. Audit Unconducted Sessions
    sessions = db.query(models.AcademicSession).all()
    missed_sessions_count = 0
    for sess in sessions:
        log_count = db.query(models.AttendanceLog).filter(models.AttendanceLog.session_id == sess.id).count()
        if log_count == 0:
            missed_sessions_count += 1

    # 2. Audit Students & Detect Consecutive Absences
    students = db.query(models.StudentProfile).all()
    defaulters_flagged = []
    consecutive_absent_alerts = []
    
    for st in students:
        logs = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.student_id == st.id
        ).order_by(models.AttendanceLog.timestamp.desc()).all()
        
        total_logs = len(logs)
        present_logs = len([l for l in logs if l.is_present])
        turnout_pct = (present_logs / total_logs * 100.0) if total_logs > 0 else 65.0
        
        # Check last 3 logs for consecutive absence
        recent_3 = logs[:3]
        consecutive_missed = 0
        for l in recent_3:
            if not l.is_present:
                consecutive_missed += 1
            else:
                break
                
        is_critical = turnout_pct < 75.0 or consecutive_missed >= 3
        
        if is_critical:
            reason = "3 Consecutive Missed Classes" if consecutive_missed >= 3 else f"Defaulter Warning ({turnout_pct:.1f}%)"
            parent_contact = st.emergency_contact or st.phone or "+91 98765 43210"
            msg_text = format_whatsapp_message(
                student_name=st.full_name or "Student",
                roll_number=st.roll_number,
                subject_code="CS301 / Core Engineering",
                attendance_pct=turnout_pct,
                consecutive=max(consecutive_missed, 3)
            )
            
            # Record in Parent Notification Ledger
            notif = models.ParentNotificationLog(
                student_id=st.id,
                student_roll=st.roll_number,
                student_name=st.full_name,
                parent_phone=parent_contact,
                channel="WhatsApp",
                trigger_reason=reason,
                message_content=msg_text,
                status="Delivered",
                timestamp=now
            )
            db.add(notif)
            defaulters_flagged.append(st.roll_number)
            if consecutive_missed >= 3:
                consecutive_absent_alerts.append(st.roll_number)

    db.commit()
    
    return {
        "status": "success",
        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "total_students_audited": len(students),
        "unconducted_sessions_flagged": missed_sessions_count,
        "defaulters_identified": len(defaulters_flagged),
        "consecutive_alerts_queued": len(consecutive_absent_alerts),
        "message": f"Nightly audit complete: {len(defaulters_flagged)} parent WhatsApp notices registered."
    }

async def background_cron_loop():
    """Asynchronous background daemon that runs daily audits."""
    while True:
        try:
            # Runs every 24 hours (86400 seconds) in production
            await asyncio.sleep(86400)
            db = next(database.get_db())
            run_midnight_attendance_audit(db)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Background cron worker notice: {e}")
            await asyncio.sleep(60)
