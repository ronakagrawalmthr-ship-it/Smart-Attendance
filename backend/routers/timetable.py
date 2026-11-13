from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, time as dtime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import csv
import io
import json
import os
import urllib.request
import urllib.error
from jose import jwt, JWTError

try:
    from .. import models, schemas, database, security
    from .auth import get_current_user
    from ..time_utils import today_ist_day_name, today_ist_str, now_ist_naive
except (ImportError, ValueError):
    import models, schemas, database, security
    from routers.auth import get_current_user
    try:
        from time_utils import today_ist_day_name, today_ist_str, now_ist_naive
    except (ImportError, ValueError):
        from datetime import timezone, timedelta
        _IST = timezone(timedelta(hours=5, minutes=30))
        def today_ist_day_name(): return datetime.now(_IST).strftime("%A")
        def today_ist_str(): return datetime.now(_IST).strftime("%Y-%m-%d")

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
    prefix="/timetable",
    tags=["Academic Timetable & AI Advisor"]
)

DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

class SlotCreateRequest(BaseModel):
    branch: str
    semester: int
    section: str = "A"
    day_of_week: str
    slot_index: int = 1
    start_time: str
    end_time: str
    duration_minutes: Optional[int] = None
    credit_weight: Optional[int] = None
    subject_id: Optional[int] = None
    custom_subject_name: Optional[str] = None
    teacher_id: Optional[int] = None
    custom_teacher_name: Optional[str] = None
    room_number: str = "LH-101"
    session_type: str = "lecture"
    sub_batch: Optional[str] = "All" 

class ChatMessage(BaseModel):
    role: str  # 'user' or 'model'
    content: str

class AIChatRequest(BaseModel):
    message: str
    student_roll: Optional[str] = None
    history: Optional[List[ChatMessage]] = []

def parse_time_str_to_minutes(t_str: str) -> Optional[int]:
    """Helper to convert '09:00 AM' or '14:30' into minutes from midnight."""
    if not t_str:
        return None
    s = t_str.strip().upper()
    try:
        if "AM" in s or "PM" in s:
            dt = datetime.strptime(s, "%I:%M %p")
        elif ":" in s:
            dt = datetime.strptime(s, "%H:%M")
        else:
            return None
        return dt.hour * 60 + dt.minute
    except Exception:
        return None

# ==============================================================================
# 1. WEEKLY TIMETABLE RETRIEVAL & CRUD
# ==============================================================================

@router.get("/weekly")
def get_weekly_timetable(
    branch: str,
    semester: int,
    section: str = "A",
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Returns the complete weekly schedule for a class, grouped by day of week.
    """
    slots = db.query(models.TimetableSlot).filter(
        models.TimetableSlot.branch == branch,
        models.TimetableSlot.semester == semester,
        models.TimetableSlot.section == section.upper()
    ).all()

    # Clean Production: If no slots exist yet, return empty list (No fake data auto-injected)
    if not slots:
        slots = []

    grouped = {day: [] for day in DAYS_ORDER}

    for s in slots:
        subj_name = s.custom_subject_name or (s.subject.name if s.subject else "Classroom Lecture")
        subj_code = s.subject.code if s.subject else "CORE"
        teacher_name = s.custom_teacher_name or (s.teacher.full_name if s.teacher else "Faculty Coordinator")
        
        slot_data = {
            "id": s.id,
            "day_of_week": s.day_of_week,
            "slot_index": s.slot_index,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "subject_id": s.subject_id,
            "subject_name": subj_name,
            "subject_code": subj_code,
            "teacher_id": s.teacher_id,
            "teacher_name": teacher_name,
            "room_number": s.room_number,
            "session_type": s.session_type,
            "sub_batch": getattr(s, "sub_batch", None) or "All",
            "duration_minutes": getattr(s, "duration_minutes", None) or 60,
            "credit_weight": getattr(s, "credit_weight", None) or 1
        }
        if s.day_of_week in grouped:
            grouped[s.day_of_week].append(slot_data)

    # Sort each day by slot_index and start_time
    for day in grouped:
        grouped[day].sort(key=lambda x: (x.get("slot_index") or 0, parse_time_str_to_minutes(x.get("start_time")) or 0))

    return {
        "success": True,
        "branch": branch,
        "semester": semester,
        "section": section.upper(),
        "days": DAYS_ORDER,
        "schedule": grouped
    }

@router.get("/today")
def get_today_timetable(
    branch: Optional[str] = None,
    semester: Optional[int] = None,
    section: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Returns today's active schedule for student or teacher, with live ongoing indicators.
    """
    # Auto-resolve from student profile if not provided
    if (not branch or not semester) and current_user and current_user.student_profile:
        sp = current_user.student_profile
        branch = sp.branch
        semester = sp.semester
        section = sp.section or "A"

    if not branch or not semester:
        first_slot = db.query(models.TimetableSlot).first()
        if first_slot:
            branch = first_slot.branch
            semester = first_slot.semester
            section = first_slot.section or "A"
        else:
            branch = "Academic Department"
            semester = 1
            section = "A"

    today_name = today_ist_day_name()
    # If today is Sunday, show Monday as next preview
    effective_day = today_name if today_name in DAYS_ORDER else "Monday"

    slots = db.query(models.TimetableSlot).filter(
        models.TimetableSlot.branch == branch,
        models.TimetableSlot.semester == semester,
        models.TimetableSlot.section == (section or "A").upper(),
        models.TimetableSlot.day_of_week == effective_day
    ).all()

    if not slots:
        slots = []

    # Calculate ongoing/upcoming status with exact Indian Standard Time (IST)
    now = now_ist_naive()
    now_mins = now.hour * 60 + now.minute

    items = []
    for s in slots:
        subj_name = s.custom_subject_name or (s.subject.name if s.subject else "Classroom Lecture")
        subj_code = s.subject.code if s.subject else "CORE"
        teacher_name = s.custom_teacher_name or (s.teacher.full_name if s.teacher else "Faculty Coordinator")
        
        s_min = parse_time_str_to_minutes(s.start_time) or 0
        e_min = parse_time_str_to_minutes(s.end_time) or (s_min + 60)

        is_ongoing = s_min <= now_mins <= e_min
        is_past = now_mins > e_min
        is_upcoming = now_mins < s_min

        items.append({
            "id": s.id,
            "slot_index": s.slot_index,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "subject_id": s.subject_id,
            "subject_name": subj_name,
            "subject_code": subj_code,
            "teacher_name": teacher_name,
            "room_number": s.room_number,
            "session_type": s.session_type,
            "sub_batch": getattr(s, "sub_batch", None) or "All",
            "is_ongoing": is_ongoing,
            "is_past": is_past,
            "is_upcoming": is_upcoming
        })

    items.sort(key=lambda x: (x.get("slot_index") or 0, parse_time_str_to_minutes(x.get("start_time")) or 0))

    # Check if today is an official institutional holiday
    today_str = today_ist_str()
    holiday_today = db.query(models.Holiday).filter(
        models.Holiday.date == today_str,
        or_(models.Holiday.department == "all", models.Holiday.department.ilike(f"%{branch}%"))
    ).first()

    return {
        "success": True,
        "day_of_week": effective_day,
        "is_preview_day": effective_day != today_name,
        "is_holiday": bool(holiday_today),
        "holiday": {
            "title": holiday_today.title,
            "description": holiday_today.description,
            "date": holiday_today.date
        } if holiday_today else None,
        "branch": branch,
        "semester": semester,
        "section": (section or "A").upper(),
        "slots": items
    }

@router.post("/slot")
def create_or_update_slot(
    payload: SlotCreateRequest,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    HOD / Admin endpoint to create or update an individual timetable slot.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if current_user.role not in [models.RoleEnum.hod, models.RoleEnum.admin, models.RoleEnum.teacher]:
        raise HTTPException(status_code=403, detail="Faculty or HOD authorization required.")

    s_min = parse_time_str_to_minutes(payload.start_time)
    e_min = parse_time_str_to_minutes(payload.end_time)
    calc_dur = (e_min - s_min) if (e_min and s_min and e_min > s_min) else 60
    final_dur = payload.duration_minutes or calc_dur
    final_credit = payload.credit_weight or (
        3 if payload.session_type == 'practical' and final_dur >= 180 else
        2 if payload.session_type == 'practical' and final_dur >= 100 else 1
    )

    slot = models.TimetableSlot(
        branch=payload.branch,
        semester=payload.semester,
        section=payload.section.upper(),
        day_of_week=payload.day_of_week,
        slot_index=payload.slot_index,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_minutes=final_dur,
        credit_weight=final_credit,
        subject_id=payload.subject_id,
        custom_subject_name=payload.custom_subject_name,
        teacher_id=payload.teacher_id,
        custom_teacher_name=payload.custom_teacher_name,
        room_number=payload.room_number,
        session_type=payload.session_type,
        sub_batch=(payload.sub_batch or "All").strip() or "All"
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    return {"success": True, "slot_id": slot.id, "message": "Timetable slot saved successfully."}

@router.put("/slot/{slot_id}")
def update_existing_slot(
    slot_id: int,
    payload: SlotCreateRequest,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """HOD / Admin endpoint to edit slot timing, duration, and details flexibly."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if current_user.role not in [models.RoleEnum.hod, models.RoleEnum.admin, models.RoleEnum.teacher]:
        raise HTTPException(status_code=403, detail="Faculty or HOD authorization required.")

    slot = db.query(models.TimetableSlot).filter(models.TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    s_min = parse_time_str_to_minutes(payload.start_time)
    e_min = parse_time_str_to_minutes(payload.end_time)
    calc_dur = (e_min - s_min) if (e_min and s_min and e_min > s_min) else 60
    final_dur = payload.duration_minutes or calc_dur
    final_credit = payload.credit_weight or (
        3 if payload.session_type == 'practical' and final_dur >= 180 else
        2 if payload.session_type == 'practical' and final_dur >= 100 else 1
    )

    slot.branch = payload.branch
    slot.semester = payload.semester
    slot.section = payload.section.upper()
    slot.day_of_week = payload.day_of_week
    slot.slot_index = payload.slot_index
    slot.start_time = payload.start_time
    slot.end_time = payload.end_time
    slot.duration_minutes = final_dur
    slot.credit_weight = final_credit
    slot.subject_id = payload.subject_id
    slot.custom_subject_name = payload.custom_subject_name
    slot.teacher_id = payload.teacher_id
    slot.custom_teacher_name = payload.custom_teacher_name
    slot.room_number = payload.room_number
    slot.session_type = payload.session_type
    slot.sub_batch = (payload.sub_batch or "All").strip() or "All"

    db.commit()
    db.refresh(slot)
    return {"success": True, "slot_id": slot.id, "message": "Slot updated with flexible timing."}

@router.delete("/slot/{slot_id}")
def delete_slot(
    slot_id: int,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    HOD / Admin endpoint to remove a timetable slot.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if current_user.role not in [models.RoleEnum.hod, models.RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="HOD authorization required to remove slots.")

    slot = db.query(models.TimetableSlot).filter(models.TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    db.delete(slot)
    db.commit()
    return {"success": True, "message": "Slot deleted successfully."}

# ==============================================================================
# 2. BULK CSV TIMETABLE IMPORT & TEMPLATE DOWNLOAD
# ==============================================================================

@router.get("/template-csv")
def download_timetable_template(
    db: Session = Depends(database.get_db)
):
    """
    Downloads standardized CSV template for HODs to easily bulk upload departmental timetables.
    Dynamically pulls registered subjects and teachers where available.
    """
    headers = ["day_of_week", "slot_index", "start_time", "end_time", "subject_name", "teacher_name", "room_number", "session_type"]
    
    db_subjects = [s.name for s in db.query(models.Subject).limit(4).all()]
    db_teachers = [t.full_name for t in db.query(models.TeacherProfile).limit(3).all()]
    
    sub1 = db_subjects[0] if len(db_subjects) > 0 else "Academic Course 1"
    sub2 = db_subjects[1] if len(db_subjects) > 1 else "Academic Course 2"
    sub3 = db_subjects[2] if len(db_subjects) > 2 else "Academic Course 3"
    t1 = db_teachers[0] if len(db_teachers) > 0 else "Faculty Member 1"
    t2 = db_teachers[1] if len(db_teachers) > 1 else "Faculty Member 2"

    sample_rows = [
        ["Monday", "1", "09:00 AM", "10:00 AM", sub1, t1, "LH-101", "lecture"],
        ["Monday", "2", "10:15 AM", "11:15 AM", sub2, t2, "LH-101", "lecture"],
        ["Monday", "3", "11:30 AM", "12:30 PM", sub3, t1, "LH-101", "lecture"],
        ["Monday", "4", "01:30 PM", "03:30 PM", f"{sub1} Practical", t2, "Lab-1", "practical"],
        ["Tuesday", "1", "09:00 AM", "10:00 AM", sub2, t1, "LH-101", "lecture"],
    ]

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(headers)
    writer.writerows(sample_rows)

    return Response(
        content=out.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=department_timetable_template.csv"}
    )

@router.post("/bulk-csv")
async def upload_bulk_timetable_csv(
    branch: str = Form(...),
    semester: int = Form(...),
    section: str = Form("A"),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Uploads and parses a CSV timetable file for the selected department, semester, and section.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if current_user.role not in [models.RoleEnum.hod, models.RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="HOD permission required.")

    content = await file.read()
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))

    imported_count = 0
    for row in reader:
        day = (row.get("day_of_week") or "").strip().capitalize()
        if day not in DAYS_ORDER:
            continue

        start_t = (row.get("start_time") or "09:00 AM").strip()
        end_t = (row.get("end_time") or "10:00 AM").strip()
        subj_name = (row.get("subject_name") or "Core Class").strip()
        teacher_name = (row.get("teacher_name") or "").strip()
        room = (row.get("room_number") or "LH-101").strip()
        sess_type = (row.get("session_type") or "lecture").strip().lower()
        slot_idx = int(row.get("slot_index") or (imported_count + 1))
        sub_batch = (row.get("sub_batch") or "All").strip() or "All"

        # Check for subject match in DB
        matched_sub = db.query(models.Subject).filter(models.Subject.name.ilike(f"%{subj_name}%")).first()

        slot = models.TimetableSlot(
            branch=branch,
            semester=semester,
            section=section.upper(),
            day_of_week=day,
            slot_index=slot_idx,
            start_time=start_t,
            end_time=end_t,
            subject_id=matched_sub.id if matched_sub else None,
            custom_subject_name=subj_name,
            custom_teacher_name=teacher_name,
            room_number=room,
            session_type=sess_type,
            sub_batch=sub_batch
        )
        db.add(slot)
        imported_count += 1

    db.commit()
    return {
        "success": True,
        "imported_count": imported_count,
        "message": f"Successfully imported {imported_count} timetable slots for {branch} Sem {semester} Sec {section.upper()}."
    }

# ==============================================================================
# 3. GEMINI AI ACADEMIC ADVISOR (OPTION 4 SUPERPOWER)
# ==============================================================================

def call_gemini_api(
    student_name: str,
    roll: str,
    branch: str,
    semester: int,
    section: str,
    pct: float,
    attended: int,
    total: int,
    safe_bunks: int,
    needed_classes: int,
    today_summary: List[str],
    api_key: str,
    holiday_title: Optional[str] = None
) -> Dict[str, Any]:
    """Calls Gemini REST API or falls back to intelligent deterministic advisor."""
    schedule_text = ", ".join(today_summary) if today_summary else "General Departmental Schedule"
    holiday_clause = f"\n- Today's Special Status: Official Institutional Holiday ({holiday_title}). College is closed today and regular classroom lectures are suspended!" if holiday_title else ""
    
    prompt = f"""You are the university's official AI Academic & Attendance Advisor for student {student_name} (Roll: {roll}) in {branch}, Semester {semester}, Section {section}.
Stats:
- Current Attendance: {pct}% ({attended}/{total} classes attended). Minimum required: 75.0%.
- Safe Rest Margin: {safe_bunks} upcoming classes safe to skip without debarment.
- Classes needed to recover if debarred: {needed_classes}.
- Today's Classes: {schedule_text}.{holiday_clause}

Respond ONLY in valid raw JSON with no markdown backticks, with these exact keys:
{{
  "headline": "A punchy, empathetic 1-sentence title",
  "status_badge": "Safe Standing" or "Debarment Risk" or "Rest Eligible" or "Holiday Recess",
  "executive_summary": "2-3 encouraging sentences summarizing the student's standing and study health in clear Hinglish/English",
  "today_gameplan": "Specific tactical advice on which class to prioritize today and why",
  "recovery_step": "Precise mathematical rule to follow (e.g. You can skip 2 classes or must attend 3)",
  "quick_tips": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"]
}}"""

    # Fast Gemini generation with strict 3.5s timeout for snappy UI response
    models_to_try = [
        "gemini-2.5-flash-lite",
        "gemini-flash-latest"
    ]

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4}
        }
        b = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=b, headers={"Content-Type": "application/json"}, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=3.5) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean potential backticks
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                parsed = json.loads(text.strip())
                parsed["source"] = f"Powered by Google Gemini ({model})"
                return parsed
        except Exception:
            continue

    # Resilient Deterministic Fallback
    if holiday_title:
        return {
            "headline": f"Official Holiday Notice: {holiday_title} - College Closed Today.",
            "status_badge": "Holiday Recess",
            "executive_summary": f"Aaj university me {holiday_title} ki official chhutti hai. Aapka current attendance record {pct}% par safely maintained hai.",
            "today_gameplan": "Aaj koi regular lectures schedule nahi hain. Self-study karein aur upcoming practical slots ke liye prepare karein.",
            "recovery_step": f"Aapka standing {pct}% hai ({safe_bunks} safe bunks available). Chhutti ke baad classes normally resume hongi.",
            "quick_tips": [
                f"Official Holiday: {holiday_title}.",
                "Next working day ka timetable check karein.",
                "Upcoming assignments complete karein."
            ],
            "source": "Institutional Academic Advisor Engine"
        }

    if pct >= 75.0:
        return {
            "headline": f"Great Job {student_name}! Your Academic Standing is in the Safe Zone.",
            "status_badge": "Rest Eligible" if safe_bunks > 0 else "Safe Standing",
            "executive_summary": f"Aapka attendance record {pct}% par strong hai. Aap bina kisi exam debarment risk ke aage badh rahe hain.",
            "today_gameplan": f"Aaj ke timetable me se primary core lecture zaroor attend karein taaki aapka buffer margin bana rahe.",
            "recovery_step": f"Aap safe zone me hain aur zaroorat padne par {safe_bunks} lecture miss kar sakte hain bina cutoff (<75%) gire.",
            "quick_tips": [
                "Aaj ke dynamic QR ko class shuru hote hi scan kar lein.",
                "Upcoming practicals aur lab slots ko priority dein.",
                "Current momentum maintain rakhein final exam clearance ke liye."
            ],
            "source": "Institutional Academic Advisor Engine"
        }
    else:
        return {
            "headline": f"Priority Alert {student_name}: Attendance Recovery Required ({pct}%).",
            "status_badge": "Debarment Risk",
            "executive_summary": f"Aapki current attendance {pct}% cutoff se thodi kam hai. Agle kuch din focus karke aap ise 75% ke upar la sakte hain.",
            "today_gameplan": f"Aaj ki sabhi scheduled classes attend karein taaki score turant improve hona shuru ho sake.",
            "recovery_step": f"Aapko agle {needed_classes} consecutive lectures bina kisi absence ke attend karne honge eligibility restore karne ke liye.",
            "quick_tips": [
                "Class me faculty ka dynamic QR turant scan karein.",
                "Agar medical leave valid hai toh HOD desk par apply karein.",
                "Har class ke baad student portal me apna live rest margin check karein."
            ],
            "source": "Institutional Academic Advisor Engine"
        }


@router.get("/ai-advisor")
def get_gemini_ai_academic_advisory(
    student_roll: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Generates personalized, high-IQ academic insights using Google Gemini AI,
    blending attendance statistics, rest allowances, and the student's live timetable.
    """
    student = None
    # Privacy safeguard: Students cannot snoop on other students' advisory or telemetry
    if current_user and current_user.role == models.RoleEnum.student:
        student = current_user.student_profile or db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
        if not student and current_user.email:
            roll_candidate = current_user.email.split("@")[0].upper()
            student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll_candidate).first()
    elif student_roll:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == student_roll.strip().upper()).first()
    elif current_user:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
        if not student and current_user.email:
            roll_candidate = current_user.email.split("@")[0].upper()
            student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll_candidate).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please ensure your student account is registered.")

    student_name = student.full_name if student else "Student"
    roll_num = student.roll_number if student else ""
    branch = student.branch if student else "Academic Department"
    semester = student.semester if student else 1
    section = student.section if student else "A"

    # 1. Compute Attendance Stats (Strictly dynamic from DB, 0.0% if no classes)
    logs = db.query(models.AttendanceLog).filter(models.AttendanceLog.student_id == student.id).all() if student else []
    total = len(logs)
    attended = sum(1 for l in logs if l.is_present)
    pct = round((attended / total * 100), 1) if total > 0 else 0.0

    # Safe bunk margin & recovery goals
    safe_bunks = max(0, int(attended / 0.75 - total)) if total > 0 and pct >= 75 else 0
    needed_classes = max(0, int((0.75 * total - attended) / 0.25) + 1) if total > 0 and pct < 75 else 0

    # 2. Today's Timetable Context
    today_name = today_ist_day_name()
    effective_day = today_name if today_name in DAYS_ORDER else "Monday"
    today_slots = db.query(models.TimetableSlot).filter(
        models.TimetableSlot.branch == branch,
        models.TimetableSlot.semester == semester,
        models.TimetableSlot.section == section,
        models.TimetableSlot.day_of_week == effective_day
    ).all()

    today_summary = [
        f"{s.start_time}-{s.end_time}: {s.custom_subject_name or (s.subject.name if s.subject else 'Class')} (Room {s.room_number})"
        for s in today_slots
    ]

    # 3. Check if today is an official college holiday
    today_str = today_ist_str()
    holiday_today = db.query(models.Holiday).filter(
        models.Holiday.date == today_str,
        or_(models.Holiday.department == "all", models.Holiday.department.ilike(f"%{branch}%"))
    ).first()
    holiday_title = holiday_today.title if holiday_today else None

    # 4. Query Google Gemini AI
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    ai_result = call_gemini_api(
        student_name=student_name,
        roll=roll_num,
        branch=branch,
        semester=semester,
        section=section,
        pct=pct,
        attended=attended,
        total=total,
        safe_bunks=safe_bunks,
        needed_classes=needed_classes,
        today_summary=today_summary,
        api_key=gemini_key,
        holiday_title=holiday_title
    )

    return {
        "success": True,
        "student_name": student_name,
        "overall_attendance": pct,
        "safe_bunk_margin": safe_bunks,
        "recovery_goal": needed_classes,
        "is_safe": pct >= 75.0,
        "is_holiday": bool(holiday_today),
        "holiday": {
            "title": holiday_today.title,
            "description": holiday_today.description,
            "date": holiday_today.date
        } if holiday_today else None,
        "ai_advisory": ai_result
    }

def call_gemini_chat(
    message: str,
    history: List[ChatMessage],
    student_name: str,
    roll: str,
    branch: str,
    semester: int,
    section: str,
    pct: float,
    attended: int,
    total: int,
    safe_bunks: int,
    needed_classes: int,
    today_name: str,
    today_schedule_text: str,
    weekly_schedule_text: str,
    holidays_text: str,
    api_key: str
) -> tuple:
    system_prompt = f"""You are Campus Copilot, the university's ultra-smart, empathetic, and friendly AI Academic Advisor for college students powered by Google Gemini.
You are talking to {student_name} (Roll: {roll}, {branch}, Semester {semester}, Section {section}).

CURRENT LIVE STUDENT TELEMETRY:
- Overall Attendance: {pct}% ({attended}/{total} classes attended). Minimum required: 75.0%.
- Safe Bunk Allowance remaining: {safe_bunks} classes (can be missed while staying >= 75%).
- Recovery Classes needed if < 75%: {needed_classes} classes.
- Today is: {today_name}
- Today's Class Schedule:
{today_schedule_text}

OFFICIAL ACADEMIC HOLIDAYS CALENDAR:
{holidays_text}

WEEKLY TIMETABLE OVERVIEW:
{weekly_schedule_text}

GUIDELINES:
1. Speak in a friendly, conversational tone (natural mix of English and Hinglish if appropriate, e.g. "Aap easily...", "Bunk safely...").
2. Be mathematically accurate with attendance calculations and bunk limits.
3. If asked about holidays, festival leaves, college closures, or exam breaks, refer directly to the Official Academic Holidays Calendar above.
4. If they ask about skipping a class today, calculate and explain the exact impact on their percentage.
5. If they ask about faculty, timings, or rooms, refer directly to their timetable.
6. Keep your responses concise, clean (use markdown bold/bullets where helpful), encouraging, and actionable.
"""

    models_to_try = [
        "gemini-3-flash-preview",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite"
    ]

    contents = []
    for h in history[-8:]:
        role = "user" if h.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": h.content}]})

    contents.append({"role": "user", "parts": [{"text": message}]})

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 600}
        }
        b = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=b, headers={"Content-Type": "application/json"}, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return text, f"Google Gemini ({model})"
        except Exception:
            continue

    # Fallback to local intelligent rule engine
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["bunk", "skip", "chhutti", "leave", "miss"]):
        if pct >= 75:
            new_pct = round(((attended) / (total + 1)) * 100, 1) if total > 0 else 80.0
            return (
                f"**Rest Allowance Analysis for {student_name}:**\n\n"
                f"Aapki current attendance **{pct}%** ({attended}/{total} classes) hai. "
                f"Aapke paas abhi **{safe_bunks} classes ka safe bunk buffer** available hai.\n\n"
                f"- Agar aap aaj 1 class skip karte hain, toh aapki attendance **{new_pct}%** ho jayegi (jo ki 75% cutoff se safe hai).\n"
                f"- **Recommendation:** Core subjects aur practical labs miss na karein, but emergency me aap 1 lecture bina kisi risk ke skip kar sakte hain!",
                "Campus Copilot Engine (Local AI)"
            )
        else:
            return (
                f"âš ï¸ **Debarment Risk Alert for {student_name}:**\n\n"
                f"Aapki attendance abhi **{pct}%** hai jo ki 75% requirement se kam hai! "
                f"Aapko kisi bhi halat me classes bunk nahi karni chahiye.\n\n"
                f"Aapko eligibility restore karne ke liye agle **{needed_classes} lectures continuously attend** karne honge.",
                "Campus Copilot Engine (Local AI)"
            )
    elif any(w in msg_lower for w in ["schedule", "timetable", "class", "today", "aaj", "routine", "lecture"]):
        return (
            f"ðŸ“… **Today's Academic Schedule ({today_name}) for {branch} (Sem {semester}-{section}):**\n\n"
            f"{today_schedule_text}\n\n"
            f"ðŸ’¡ **Tip:** Class me pahuchte hi Teacher Kiosk ka 10-second dynamic QR code scan kar lena!",
            "Campus Copilot Engine (Local AI)"
        )
    elif any(w in msg_lower for w in ["attendance", "percent", "score", "status"]):
        return (
            f"ðŸ“Š **Attendance Snapshot for {student_name}:**\n\n"
            f"- **Overall Percentage:** **{pct}%**\n"
            f"- **Attended:** {attended} of {total} conducted classes\n"
            f"- **Status:** {'ðŸŸ¢ Safe Standing (Exam Cleared)' if pct >= 75 else 'ðŸ”´ Debarment Alert (< 75%)'}\n"
            f"- **Safe Bunk Cushion:** {safe_bunks} lecture(s)\n\n"
            f"Discipline maintain rakhein internal assessment marks maximize karne ke liye!",
            "Campus Copilot Engine (Local AI)"
        )
    else:
        return (
            f"Hello {student_name}! Main aapka **Campus AI Copilot** hoon.\n\n"
            f"Main aapki **attendance ({pct}%)**, **aaj ke timetable**, aur **safe bunk calculations** par live guidance de sakta hoon.\n\n"
            f"Aap mujhse pooch sakte hain:\n"
            f"- *'Kya mai aaj ki last class bunk kar sakta hoon?'*\n"
            f"- *'Aaj meri classes ka schedule kya hai?'*\n"
            f"- *'85% attendance ke liye kitni classes chahiye?'*",
            "Campus Copilot Engine (Local AI)"
        )


@router.post("/ai-chat")
def campus_copilot_chat(
    payload: AIChatRequest,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Interactive Campus AI Copilot Chatbot powered by Google Gemini.
    Provides conversational answers about attendance health, safe bunks,
    today's schedule, and timetable queries with full student telemetry context.
    """
    student = None
    # Privacy safeguard: Students cannot snoop on other students' chat telemetry
    if current_user and current_user.role == models.RoleEnum.student:
        student = current_user.student_profile or db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
        if not student and current_user.email:
            roll_candidate = current_user.email.split("@")[0].upper()
            student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll_candidate).first()
    elif payload.student_roll:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == payload.student_roll.strip().upper()).first()
    elif current_user:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
        if not student and current_user.email:
            roll_candidate = current_user.email.split("@")[0].upper()
            student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll_candidate).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please ensure your student account is registered.")

    student_name = student.full_name or "Student"
    roll_num = student.roll_number or ""
    branch = student.branch or "Academic Department"
    semester = student.semester or 1
    section = student.section or "A"

    # Compute Attendance Stats (Strictly dynamic from DB, 0.0% if no sessions yet)
    logs = db.query(models.AttendanceLog).filter(models.AttendanceLog.student_id == student.id).all() if student else []
    total = len(logs)
    attended = sum(1 for l in logs if l.is_present)
    pct = round((attended / total * 100), 1) if total > 0 else 0.0

    # Safe bunks / recovery
    safe_bunks = max(0, int(attended / 0.75 - total)) if total > 0 and pct >= 75 else 0
    needed_classes = max(0, int((0.75 * total - attended) / 0.25) + 1) if total > 0 and pct < 75 else 0

    # Today's slots
    today_name = today_ist_day_name()
    effective_day = today_name if today_name in DAYS_ORDER else "Monday"
    today_slots = db.query(models.TimetableSlot).filter(
        models.TimetableSlot.branch == branch,
        models.TimetableSlot.semester == semester,
        models.TimetableSlot.section == section,
        models.TimetableSlot.day_of_week == effective_day
    ).all()

    today_schedule_text = "\n".join([
        f"- {s.start_time} to {s.end_time}: {s.custom_subject_name or (s.subject.name if s.subject else 'Class')} | Faculty: {s.custom_teacher_name or (s.teacher.full_name if s.teacher else 'Faculty')} | Room: {s.room_number} ({s.session_type})"
        for s in today_slots
    ]) or "No classes scheduled today."

    # Weekly overview
    all_slots = db.query(models.TimetableSlot).filter(
        models.TimetableSlot.branch == branch,
        models.TimetableSlot.semester == semester,
        models.TimetableSlot.section == section
    ).all()
    weekly_schedule_text = "\n".join([
        f"[{s.day_of_week}] {s.start_time}-{s.end_time}: {s.custom_subject_name or 'Subject'} ({s.room_number})"
        for s in all_slots
    ]) or "Standard College Curriculum"

    # Fetch official college holidays
    upcoming_holidays = db.query(models.Holiday).filter(
        models.Holiday.date >= today_ist_str()
    ).order_by(models.Holiday.date.asc()).limit(8).all()
    holidays_text = "\n".join([
        f"- {h.date}: {h.title} ({h.description or 'Official Holiday'})"
        for h in upcoming_holidays
    ]) or "No upcoming holidays declared in the official academic calendar."

    gemini_key = os.getenv("GEMINI_API_KEY", "")

    reply, source = call_gemini_chat(
        message=payload.message,
        history=payload.history or [],
        student_name=student_name,
        roll=roll_num,
        branch=branch,
        semester=semester,
        section=section,
        pct=pct,
        attended=attended,
        total=total,
        safe_bunks=safe_bunks,
        needed_classes=needed_classes,
        today_name=today_name,
        today_schedule_text=today_schedule_text,
        weekly_schedule_text=weekly_schedule_text,
        holidays_text=holidays_text,
        api_key=gemini_key
    )

    suggested = [
        "Is college closed today or any holiday this week?",
        "Can I safely bunk today's last lecture?",
        "Show my schedule for today",
        f"How many classes do I need for 85% attendance?"
    ]

    return {
        "success": True,
        "reply": reply,
        "source": source,
        "suggested_questions": suggested
    }

