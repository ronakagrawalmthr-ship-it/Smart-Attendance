import asyncio
import os
from datetime import datetime, date, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

try:
    import models
    import database
    try:
        from time_utils import now_ist_naive, today_ist_str
    except (ImportError, ValueError):
        from ..time_utils import now_ist_naive, today_ist_str
except ImportError:
    try:
        from .. import models, database
        from ..time_utils import now_ist_naive, today_ist_str
    except (ImportError, ValueError):
        from backend import models, database
try:
    from .email_service import send_system_email
except (ImportError, ValueError):
    try:
        from services.email_service import send_system_email
    except (ImportError, ValueError):
        from backend.services.email_service import send_system_email
        from backend.time_utils import now_ist_naive, today_ist_str

# Resend email service (already configured via .env RESEND_API_KEY)
try:
    import resend
    resend.api_key = os.environ.get("RESEND_API_KEY", "")
except ImportError:
    resend = None


def build_parent_alert_email(
    student_name: str,
    roll_number: str,
    attendance_pct: float,
    consecutive: int,
    trigger: str,
    inst_name: str,
    branch: str,
    semester: int,
) -> str:
    """Builds a premium HTML email for parent/guardian attendance alerts."""
    status_color = "#DC2626" if attendance_pct < 75.0 else "#D97706"
    status_label = "CRITICAL — Below 75%" if attendance_pct < 75.0 else "WARNING — Consecutive Absences"
    pct_display = f"{attendance_pct:.1f}%"
    consec_text = f"{consecutive} consecutive lecture{'s' if consecutive != 1 else ''}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Attendance Alert - {inst_name}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;max-width:560px;">
        <tr>
          <td style="background:linear-gradient(135deg,#1E293B 0%,#334155 100%);padding:28px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase;">{inst_name.upper()}</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#FFFFFF;">Attendance Alert Notice</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#CBD5E1;">Academic Governance - Automated Notification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            <div style="margin:24px 0 0;background:{status_color}1A;border:1.5px solid {status_color}40;border-radius:10px;padding:8px 16px;display:inline-block;">
              <span style="font-size:12px;font-weight:700;color:{status_color};">{status_label}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">Dear Parent / Guardian,</p>
            <p style="margin:12px 0 0;font-size:15px;color:#334155;line-height:1.7;">
              This is an automated attendance alert from <strong>{inst_name}</strong> regarding your ward:
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;">
            <table width="100%" cellpadding="16" cellspacing="0" style="background:#F1F5F9;border-radius:14px;border:1px solid #E2E8F0;">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;color:#64748B;text-transform:uppercase;">Student</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#0F172A;">{student_name}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#64748B;">Roll No: <strong>{roll_number}</strong> &nbsp;|&nbsp; {branch} - Semester {semester}</p>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #E2E8F0;padding-top:14px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:12px;background:#FFFFFF;border-radius:10px;border:1px solid #E2E8F0;">
                        <p style="margin:0;font-size:11px;font-weight:600;color:#64748B;">Overall Attendance</p>
                        <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:{status_color};">{pct_display}</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#94A3B8;">Minimum Required: 75.0%</p>
                      </td>
                      <td width="12"></td>
                      <td align="center" style="padding:12px;background:#FFFFFF;border-radius:10px;border:1px solid #E2E8F0;">
                        <p style="margin:0;font-size:11px;font-weight:600;color:#64748B;">Consecutive Absences</p>
                        <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#DC2626;">{consecutive}</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#94A3B8;">Lectures Missed in a Row</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.8;">
              Your ward has been marked absent for <strong>{consec_text}</strong>.
              Under institutional academic bylaws, a minimum of <strong>75% cumulative attendance</strong>
              is mandatory for semester examination eligibility and hall admission.
            </p>
            <p style="margin:12px 0 0;font-size:14px;color:#475569;line-height:1.8;">
              Please counsel your ward to attend upcoming lectures without fail.
              For valid medical or personal emergencies, contact the HOD office for leave condonation.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;padding:20px 32px;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
              This is an automated message from the <strong>{inst_name} Smart Attendance System</strong>.<br />
              Do not reply to this email. Contact the academic office for queries.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
 </body>
</html>"""


def send_parent_alert_email(
    to_email: str,
    student_name: str,
    roll_number: str,
    attendance_pct: float,
    consecutive: int,
    trigger: str,
    inst_name: str,
    branch: str = "Engineering",
    semester: int = 1,
) -> bool:
    """
    Dispatches a real parent alert email via centralized email service (Resend + SMTP).
    Returns True on success, False on failure.
    """
    try:
        try:
            from .email_service import send_system_email
        except (ImportError, ValueError):
            from services.email_service import send_system_email

        html_body = build_parent_alert_email(
            student_name=student_name,
            roll_number=roll_number,
            attendance_pct=attendance_pct,
            consecutive=consecutive,
            trigger=trigger,
            inst_name=inst_name,
            branch=branch,
            semester=semester,
        )

        subject = (
            f"Attendance Alert: {student_name} ({roll_number}) - {attendance_pct:.1f}% | {inst_name}"
            if attendance_pct < 75.0
            else f"Absence Notice: {student_name} ({roll_number}) - {consecutive} Consecutive Absences | {inst_name}"
        )

        success, err = send_system_email(
            to_email=to_email,
            subject=subject,
            html_content=html_body,
            sender_name=f"{inst_name} Academic Office"
        )
        if success:
            print(f"[EMAIL SENT] Alert dispatched to {to_email} for {student_name} ({attendance_pct:.1f}%)")
            return True
        else:
            print(f"[EMAIL NOTICE] Could not deliver to {to_email}: {err}")
            return False

    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


def run_midnight_attendance_audit(db: Session, force: bool = False) -> Dict[str, Any]:
    """
    Automated Midnight Background Worker with Distributed Mutex Lock & Idempotency:
    1. Enforces singleton execution across multi-worker environments (Gunicorn/FastAPI).
    2. Recalculates student cumulative attendance matrices.
    3. Detects students with >= 3 consecutive missed lectures or < 75% attendance.
    4. Enforces idempotency_key to guarantee zero duplicate parent alerts.
    5. Records delivery status in the Parent Notification Ledger.
    """
    now = now_ist_naive()
    today_str = today_ist_str()

    # 1. Distributed Singleton Check: Prevent multiple workers from running audit on the same day
    if not force:
        lock_record = db.query(models.SystemSetting).filter(
            models.SystemSetting.key == "last_midnight_audit_date"
        ).first()
        if lock_record and lock_record.value == today_str:
            return {
                "status": "skipped",
                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "message": f"Nightly audit already executed for {today_str}. Skipping to prevent duplicate processing."
            }

        # Acquire lock for today
        if not lock_record:
            lock_record = models.SystemSetting(key="last_midnight_audit_date", value=today_str)
            db.add(lock_record)
        else:
            lock_record.value = today_str
        db.commit()

    inst_setting = db.query(models.SystemSetting).filter(
        models.SystemSetting.key == "institution_name"
    ).first()
    inst_name = inst_setting.value if inst_setting else "Campus"

    # Calendar Freeze: Check if today is a Holiday, Preparation Leave, or Exam Break
    today_holiday = db.query(models.Holiday).filter(
        or_(
            models.Holiday.date == today_str,
            and_(models.Holiday.end_date != None, models.Holiday.date <= today_str, models.Holiday.end_date >= today_str)
        )
    ).first()
    if today_holiday and getattr(today_holiday, "event_type", "HOLIDAY") in ["PREPARATION_LEAVE", "EXAM_PERIOD", "SEMESTER_BREAK", "EMERGENCY_CLOSURE", "HOLIDAY"]:
        return {
            "status": "calendar_freeze_active",
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S IST"),
            "event": today_holiday.title,
            "event_type": getattr(today_holiday, "event_type", "HOLIDAY"),
            "message": f"Academic calendar freeze active ({today_holiday.title}). Defaulter penalty alerts safely suspended for students."
        }

    # 2. Audit unconducted sessions (Single optimized outer-join query - Zero N+1 loop)
    missed_sessions_count = db.query(models.AcademicSession).outerjoin(
        models.AttendanceLog, models.AcademicSession.id == models.AttendanceLog.session_id
    ).filter(
        models.AttendanceLog.id.is_(None)
    ).count()

    # 3. Audit each student with Idempotency Key checks
    # Eagerly filter only active enrolled students
    students = db.query(models.StudentProfile).join(
        models.User, models.StudentProfile.user_id == models.User.id
    ).filter(models.User.is_active == True).all()
    
    defaulters_flagged = []
    emails_sent = 0
    emails_failed = 0
    skipped_duplicates = 0

    for st in students:
        # Audit attendance strictly scoped to student's current active semester
        logs_query = db.query(models.AttendanceLog, models.AcademicSession).join(
            models.AcademicSession, models.AttendanceLog.session_id == models.AcademicSession.id
        ).filter(
            models.AttendanceLog.student_id == st.id,
            models.AcademicSession.semester == (st.semester or 1)
        ).order_by(models.AcademicSession.start_time.desc()).all()

        total_logs = len(logs_query)
        if total_logs == 0:
            continue  # No attendance recorded in current semester yet - skip

        present_logs = sum(1 for l, s in logs_query if l.is_present)
        turnout_pct = (present_logs / total_logs * 100.0)

        # Check last 3 chronological lectures in current semester for consecutive absences
        consecutive_missed = 0
        for l, s in logs_query[:3]:
            if not l.is_present:
                consecutive_missed += 1
            else:
                break

        is_critical = (turnout_pct < 75.0) or (consecutive_missed >= 3)
        if not is_critical:
            continue

        trigger_reason = (
            "3 Consecutive Missed Classes"
            if consecutive_missed >= 3
            else f"Defaulter Warning ({turnout_pct:.1f}%)"
        )

        # Idempotency Key check: has this specific alert already been dispatched today?
        idempotency_key = f"{st.id}:{today_str}:{trigger_reason[:20]}"
        existing_alert = db.query(models.ParentNotificationLog).filter(
            models.ParentNotificationLog.idempotency_key == idempotency_key
        ).first()

        if existing_alert:
            skipped_duplicates += 1
            continue

        # Resolve parent destination contact: priority parent_email > emergency_contact
        dest_email = None
        if hasattr(st, 'parent_email') and st.parent_email and "@" in st.parent_email:
            dest_email = st.parent_email.strip().lower()
        elif st.emergency_contact and "@" in st.emergency_contact:
            dest_email = st.emergency_contact.strip().lower()

        contact_phone = (st.phone or st.emergency_contact or "").strip()

        if not dest_email:
            # Graceful No Contact handling: User Rule "agar kisi ke parents ka contact na ho toh none kar dena"
            notif = models.ParentNotificationLog(
                idempotency_key=idempotency_key,
                student_id=st.id,
                student_roll=st.roll_number,
                student_name=st.full_name,
                parent_phone=contact_phone if contact_phone else "None",
                parent_email="None",
                recipient="None",
                channel="Email",
                trigger_reason=trigger_reason,
                message_content=f"No parent contact registered (None) — {trigger_reason}",
                status="None (Skipped - No Contact)",
                timestamp=now,
            )
            db.add(notif)
            defaulters_flagged.append(st.roll_number)
            continue

        success = send_parent_alert_email(
            to_email=dest_email,
            student_name=st.full_name or "Student",
            roll_number=st.roll_number,
            attendance_pct=turnout_pct,
            consecutive=consecutive_missed,
            trigger=trigger_reason,
            inst_name=inst_name,
            branch=st.branch or "Academic Department",
            semester=st.semester or 1,
        )

        notif = models.ParentNotificationLog(
            idempotency_key=idempotency_key,
            student_id=st.id,
            student_roll=st.roll_number,
            student_name=st.full_name,
            parent_phone=contact_phone if contact_phone else "None",
            parent_email=dest_email,
            recipient=dest_email,
            channel="Email",
            trigger_reason=trigger_reason,
            message_content=f"Email alert sent to {dest_email} — {trigger_reason}",
            status="Delivered" if success else "Failed",
            timestamp=now,
        )
        db.add(notif)
        defaulters_flagged.append(st.roll_number)
        if success:
            emails_sent += 1
        else:
            emails_failed += 1

    db.commit()

    return {
        "status": "success",
        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "total_students_audited": len(students),
        "unconducted_sessions_flagged": missed_sessions_count,
        "defaulters_identified": len(defaulters_flagged),
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "skipped_duplicates": skipped_duplicates,
        "message": f"Nightly audit complete: {emails_sent} parent email alerts dispatched. {skipped_duplicates} duplicate triggers prevented.",
    }


def get_seconds_until_midnight() -> float:
    now = now_ist_naive()
    tomorrow = now.date() + timedelta(days=1)
    midnight = datetime.combine(tomorrow, datetime.min.time())
    diff = (midnight - now).total_seconds()
    return max(60.0, diff)

async def background_cron_loop():
    """Asynchronous background daemon that runs nightly attendance audits at midnight every night."""
    while True:
        try:
            sleep_sec = get_seconds_until_midnight()
            print(f"[CRON] Next midnight attendance audit scheduled in {round(sleep_sec / 3600, 2)} hours.")
            await asyncio.sleep(sleep_sec)

            # Properly manage session lifecycle (prevents connection leaks)
            db = database.SessionLocal()
            try:
                # Offload synchronous DB operations and SMTP alerts to thread pool (Zero Event-Loop Block)
                result = await asyncio.to_thread(run_midnight_attendance_audit, db)
                print(f"[CRON] {result['message']}")
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[CRON ERROR] Background audit failed: {e}")
            await asyncio.sleep(300)
