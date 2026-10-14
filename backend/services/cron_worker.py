import asyncio
import os
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session

try:
    import models
    import database
except ImportError:
    try:
        from .. import models, database
    except (ImportError, ValueError):
        from backend import models, database

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
    status_label = "CRITICAL â€” Below 75%" if attendance_pct < 75.0 else "WARNING â€” Consecutive Absences"
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


def run_midnight_attendance_audit(db: Session) -> Dict[str, Any]:
    """
    Automated Midnight Background Worker:
    1. Scans unconducted timetable sessions and flags missed classes.
    2. Recalculates student cumulative attendance matrices.
    3. Detects students with >= 3 consecutive missed lectures or < 75% attendance.
    4. Sends real Resend email alerts to parent_email (falls back to student email).
    5. Records delivery status in the Parent Notification Ledger.
    """
    now = datetime.utcnow()

    inst_setting = db.query(models.SystemSetting).filter(
        models.SystemSetting.key == "institution_name"
    ).first()
    inst_name = inst_setting.value if inst_setting else "Campus"

    # 1. Audit unconducted sessions
    sessions = db.query(models.AcademicSession).all()
    missed_sessions_count = sum(
        1 for sess in sessions
        if db.query(models.AttendanceLog).filter(models.AttendanceLog.session_id == sess.id).count() == 0
    )

    # 2. Audit each student
    students = db.query(models.StudentProfile).all()
    defaulters_flagged = []
    emails_sent = 0
    emails_failed = 0

    for st in students:
        logs = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.student_id == st.id
        ).order_by(models.AttendanceLog.timestamp.desc()).all()

        total_logs = len(logs)
        if total_logs == 0:
            continue  # No attendance yet â€” skip

        present_logs = sum(1 for l in logs if l.is_present)
        turnout_pct = (present_logs / total_logs * 100.0)

        # Check last 3 logs for consecutive absences
        consecutive_missed = 0
        for l in logs[:3]:
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

        # Resolve destination email â€” priority: parent_email > emergency_contact > student login email
        dest_email = None
        if hasattr(st, 'parent_email') and st.parent_email and "@" in st.parent_email:
            dest_email = st.parent_email.strip().lower()
        elif st.emergency_contact and "@" in st.emergency_contact:
            dest_email = st.emergency_contact.strip().lower()
        else:
            user = db.query(models.User).filter(models.User.id == st.user_id).first()
            if user and user.email and "@" in user.email:
                dest_email = user.email.strip().lower()

        if not dest_email:
            print(f"[SKIP] No valid email for {st.roll_number} â€” skipping alert.")
            continue

        success = send_parent_alert_email(
            to_email=dest_email,
            student_name=st.full_name or "Student",
            roll_number=st.roll_number,
            attendance_pct=turnout_pct,
            consecutive=consecutive_missed,
            trigger=trigger_reason,
            inst_name=inst_name,
            branch=st.branch or "Engineering",
            semester=st.semester or 1,
        )

        notif = models.ParentNotificationLog(
            student_id=st.id,
            student_roll=st.roll_number,
            student_name=st.full_name,
            parent_phone=dest_email,   # stores the email used for dispatch
            channel="Email",
            trigger_reason=trigger_reason,
            message_content=f"Email alert sent to {dest_email} â€” {trigger_reason}",
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
        "message": f"Nightly audit complete: {emails_sent} parent email alerts dispatched via Resend.",
    }


from datetime import datetime, timedelta

def get_seconds_until_midnight() -> float:
    now = datetime.now()
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
                result = run_midnight_attendance_audit(db)
                print(f"[CRON] {result['message']}")
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[CRON ERROR] Background audit failed: {e}")
            await asyncio.sleep(300)
