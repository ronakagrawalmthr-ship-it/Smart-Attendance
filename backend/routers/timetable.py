from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
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
except (ImportError, ValueError):
    import models, schemas, database, security
    from routers.auth import get_current_user

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
    subject_id: Optional[int] = None
    custom_subject_name: Optional[str] = None
    teacher_id: Optional[int] = None
    custom_teacher_name: Optional[str] = None
    room_number: str = "LH-101"
    session_type: str = "lecture"

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

    # If no slots exist yet, auto-seed a realistic standard schedule for this class
    if not slots:
        seed_sample_timetable_for_class(branch, semester, section.upper(), db)
        slots = db.query(models.TimetableSlot).filter(
            models.TimetableSlot.branch == branch,
            models.TimetableSlot.semester == semester,
            models.TimetableSlot.section == section.upper()
        ).all()

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
            "session_type": s.session_type
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
            first_st = db.query(models.StudentProfile).first()
            if first_st:
                branch = first_st.branch
                semester = first_st.semester
                section = first_st.section or "A"
            else:
                branch = "Academic Department"
                semester = 1
                section = "A"

    today_name = datetime.utcnow().strftime("%A")
    # If today is Sunday, show Monday as next preview
    effective_day = today_name if today_name in DAYS_ORDER else "Monday"

    slots = db.query(models.TimetableSlot).filter(
        models.TimetableSlot.branch == branch,
        models.TimetableSlot.semester == semester,
        models.TimetableSlot.section == (section or "A").upper(),
        models.TimetableSlot.day_of_week == effective_day
    ).all()

    if not slots:
        seed_sample_timetable_for_class(branch, semester, (section or "A").upper(), db)
        slots = db.query(models.TimetableSlot).filter(
            models.TimetableSlot.branch == branch,
            models.TimetableSlot.semester == semester,
            models.TimetableSlot.section == (section or "A").upper(),
            models.TimetableSlot.day_of_week == effective_day
        ).all()

    # Calculate ongoing/upcoming status
    now = datetime.now()
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
            "is_ongoing": is_ongoing,
            "is_past": is_past,
            "is_upcoming": is_upcoming
        })

    items.sort(key=lambda x: (x.get("slot_index") or 0, parse_time_str_to_minutes(x.get("start_time")) or 0))

    return {
        "success": True,
        "day_of_week": effective_day,
        "is_preview_day": effective_day != today_name,
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
    if current_user and current_user.role not in [models.RoleEnum.hod, models.RoleEnum.admin, models.RoleEnum.teacher]:
        raise HTTPException(status_code=403, detail="Faculty or HOD authorization required.")

    slot = models.TimetableSlot(
        branch=payload.branch,
        semester=payload.semester,
        section=payload.section.upper(),
        day_of_week=payload.day_of_week,
        slot_index=payload.slot_index,
        start_time=payload.start_time,
        end_time=payload.end_time,
        subject_id=payload.subject_id,
        custom_subject_name=payload.custom_subject_name,
        teacher_id=payload.teacher_id,
        custom_teacher_name=payload.custom_teacher_name,
        room_number=payload.room_number,
        session_type=payload.session_type
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    return {"success": True, "slot_id": slot.id, "message": "Timetable slot saved successfully."}

@router.delete("/slot/{slot_id}")
def delete_slot(
    slot_id: int,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    HOD / Admin endpoint to remove a timetable slot.
    """
    if current_user and current_user.role not in [models.RoleEnum.hod, models.RoleEnum.admin]:
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
def download_timetable_template():
    """
    Downloads standardized CSV template for HODs to easily bulk upload departmental timetables.
    """
    headers = ["day_of_week", "slot_index", "start_time", "end_time", "subject_name", "teacher_name", "room_number", "session_type"]
    sample_rows = [
        ["Monday", "1", "09:00 AM", "10:00 AM", "Operating Systems", "Dr. Durga Pooja", "LH-301", "lecture"],
        ["Monday", "2", "10:15 AM", "11:15 AM", "Database Management Systems", "Prof. Rajesh Sharma", "LH-301", "lecture"],
        ["Monday", "3", "11:30 AM", "12:30 PM", "Computer Networks", "Dr. Ananya Roy", "LH-301", "lecture"],
        ["Monday", "4", "01:30 PM", "03:30 PM", "Operating Systems Lab", "Dr. Durga Pooja", "Lab-2", "practical"],
        ["Tuesday", "1", "09:00 AM", "10:00 AM", "Cloud Computing & DevOps", "Prof. Rajesh Sharma", "LH-301", "lecture"],
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
    if current_user and current_user.role not in [models.RoleEnum.hod, models.RoleEnum.admin]:
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
            session_type=sess_type
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
    if student_roll:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == student_roll.strip().upper()).first()
    if not student and current_user:
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
    today_name = datetime.utcnow().strftime("%A")
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

    # 3. Query Google Gemini AI
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
        api_key=gemini_key
    )

    return {
        "success": True,
        "student_name": student_name,
        "overall_attendance": pct,
        "safe_bunk_margin": safe_bunks,
        "recovery_goal": needed_classes,
        "is_safe": pct >= 75.0,
        "ai_advisory": ai_result
    }

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
    api_key: str
) -> Dict[str, Any]:
    """Calls Gemini REST API or falls back to intelligent deterministic advisor."""
    schedule_text = ", ".join(today_summary) if today_summary else "General Departmental Schedule"
    
    prompt = f"""You are the university's official AI Academic & Attendance Advisor for student {student_name} (Roll: {roll}) in {branch}, Semester {semester}, Section {section}.
Stats:
- Current Attendance: {pct}% ({attended}/{total} classes attended). Minimum required: 75.0%.
- Safe Rest Margin: {safe_bunks} upcoming classes safe to skip without debarment.
- Classes needed to recover if debarred: {needed_classes}.
- Today's Classes: {schedule_text}.

Respond ONLY in valid raw JSON with no markdown backticks, with these exact keys:
{{
  "headline": "A punchy, empathetic 1-sentence title",
  "status_badge": "Safe Standing" or "Debarment Risk" or "Rest Eligible",
  "executive_summary": "2-3 encouraging sentences summarizing the student's standing and study health in clear Hinglish/English",
  "today_gameplan": "Specific tactical advice on which class to prioritize today and why",
  "recovery_step": "Precise mathematical rule to follow (e.g. You can skip 2 classes or must attend 3)",
  "quick_tips": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"]
}}"""

    # Model priority list
    models_to_try = [
        "gemini-3-flash-preview",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite"
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
            with urllib.request.urlopen(req, timeout=6) as response:
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
    if payload.student_roll:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == payload.student_roll.strip().upper()).first()
    if not student and current_user:
        student = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
        if not student and current_user.email:
            roll_candidate = current_user.email.split("@")[0].upper()
            student = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == roll_candidate).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please ensure your student account is registered.")

    student_name = student.full_name if student else "Student"
    roll_num = student.roll_number if student else ""
    branch = student.branch if student else "Engineering"
    semester = student.semester if student else 1
    section = student.section if student else "A"

    # Compute Attendance Stats (Strictly dynamic from DB, 0.0% if no sessions yet)
    logs = db.query(models.AttendanceLog).filter(models.AttendanceLog.student_id == student.id).all() if student else []
    total = len(logs)
    attended = sum(1 for l in logs if l.is_present)
    pct = round((attended / total * 100), 1) if total > 0 else 0.0

    # Safe bunks / recovery
    safe_bunks = max(0, int(attended / 0.75 - total)) if total > 0 and pct >= 75 else 0
    needed_classes = max(0, int((0.75 * total - attended) / 0.25) + 1) if total > 0 and pct < 75 else 0

    # Today's slots
    today_name = datetime.utcnow().strftime("%A")
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
        api_key=gemini_key
    )

    suggested = [
        "Can I safely bunk today's last lecture?",
        "Show my schedule for today",
        f"How many classes do I need for 85% attendance?",
        "Who is teaching Operating Systems?"
    ]

    return {
        "success": True,
        "reply": reply,
        "source": source,
        "suggested_questions": suggested
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

WEEKLY TIMETABLE OVERVIEW:
{weekly_schedule_text}

GUIDELINES:
1. Speak in a friendly, conversational tone (natural mix of English and Hinglish if appropriate, e.g. "Aap easily...", "Bunk safely...").
2. Be mathematically accurate with attendance calculations and bunk limits.
3. If they ask about skipping a class today, calculate and explain the exact impact on their percentage.
4. If they ask about faculty, timings, or rooms, refer directly to their timetable.
5. Keep your responses concise, clean (use markdown bold/bullets where helpful), encouraging, and actionable.
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
                f"⚠️ **Debarment Risk Alert for {student_name}:**\n\n"
                f"Aapki attendance abhi **{pct}%** hai jo ki 75% requirement se kam hai! "
                f"Aapko kisi bhi halat me classes bunk nahi karni chahiye.\n\n"
                f"Aapko eligibility restore karne ke liye agle **{needed_classes} lectures continuously attend** karne honge.",
                "Campus Copilot Engine (Local AI)"
            )
    elif any(w in msg_lower for w in ["schedule", "timetable", "class", "today", "aaj", "routine", "lecture"]):
        return (
            f"📅 **Today's Academic Schedule ({today_name}) for {branch} (Sem {semester}-{section}):**\n\n"
            f"{today_schedule_text}\n\n"
            f"💡 **Tip:** Class me pahuchte hi Teacher Kiosk ka 10-second dynamic QR code scan kar lena!",
            "Campus Copilot Engine (Local AI)"
        )
    elif any(w in msg_lower for w in ["attendance", "percent", "score", "status"]):
        return (
            f"📊 **Attendance Snapshot for {student_name}:**\n\n"
            f"- **Overall Percentage:** **{pct}%**\n"
            f"- **Attended:** {attended} of {total} conducted classes\n"
            f"- **Status:** {'🟢 Safe Standing (Exam Cleared)' if pct >= 75 else '🔴 Debarment Alert (< 75%)'}\n"
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

def seed_sample_timetable_for_class(branch: str, semester: int, section: str, db: Session):
    """Auto-seeds a realistic weekly college timetable adapting to the target branch and DB subjects."""
    existing_subjects = db.query(models.Subject).filter(
        models.Subject.branch.ilike(f"%{branch}%")
    ).all()
    
    dept_teachers = db.query(models.TeacherProfile).filter(
        models.TeacherProfile.department.ilike(f"%{branch}%")
    ).all()
    teacher_names = [t.full_name for t in dept_teachers] if dept_teachers else [
        "Dr. Department Professor", "Prof. Academic Faculty", "Faculty Coordinator", "Visiting Specialist"
    ]
    
    if existing_subjects:
        subject_names = [s.name for s in existing_subjects]
    else:
        b_clean = branch.strip()
        b_lower = b_clean.lower()
        if "mech" in b_lower:
            subject_names = ["Thermodynamics & Heat Transfer", "Fluid Mechanics & Machinery", "Kinematics of Machines", "Manufacturing Technology"]
        elif "civil" in b_lower:
            subject_names = ["Structural Analysis", "Surveying & Geomatics", "Geotechnical Engineering", "Hydraulics Engineering"]
        elif "elec" in b_lower or "ee" in b_lower:
            subject_names = ["Circuit Theory & Networks", "Electrical Machines", "Power Systems Engineering", "Control Systems"]
        elif "comm" in b_lower or "ece" in b_lower:
            subject_names = ["Signals & Systems", "Digital Electronics", "Electromagnetic Fields", "Communication Systems"]
        elif "it" in b_lower:
            subject_names = ["Web Technologies", "Database Management Systems", "Data Structures & Algorithms", "Computer Networks"]
        elif "comp" in b_lower or "cs" in b_lower:
            subject_names = ["Operating Systems", "Database Management Systems", "Computer Networks", "Design & Analysis of Algorithms"]
        else:
            subject_names = [f"{b_clean} Principles", f"{b_clean} Analysis", f"{b_clean} System Engineering", f"{b_clean} Professional Practice"]

    sample_data = {
        "Monday": [
            ("09:00 AM", "10:00 AM", subject_names[0 % len(subject_names)], teacher_names[0 % len(teacher_names)], "LH-301", "lecture"),
            ("10:15 AM", "11:15 AM", subject_names[1 % len(subject_names)], teacher_names[1 % len(teacher_names)], "LH-301", "lecture"),
            ("11:30 AM", "12:30 PM", subject_names[2 % len(subject_names)], teacher_names[2 % len(teacher_names)], "LH-301", "lecture"),
            ("01:30 PM", "03:30 PM", f"{subject_names[3 % len(subject_names)]} Lab", teacher_names[0 % len(teacher_names)], "Department Lab-1", "practical"),
        ],
        "Tuesday": [
            ("09:00 AM", "10:00 AM", subject_names[1 % len(subject_names)], teacher_names[1 % len(teacher_names)], "LH-302", "lecture"),
            ("10:15 AM", "11:15 AM", subject_names[2 % len(subject_names)], teacher_names[2 % len(teacher_names)], "LH-302", "lecture"),
            ("11:30 AM", "12:30 PM", subject_names[0 % len(subject_names)], teacher_names[0 % len(teacher_names)], "LH-302", "lecture"),
            ("01:30 PM", "03:30 PM", f"{subject_names[1 % len(subject_names)]} Practical", teacher_names[1 % len(teacher_names)], "Department Lab-2", "practical"),
        ],
        "Wednesday": [
            ("09:00 AM", "10:00 AM", subject_names[2 % len(subject_names)], teacher_names[2 % len(teacher_names)], "LH-301", "lecture"),
            ("10:15 AM", "11:15 AM", subject_names[0 % len(subject_names)], teacher_names[0 % len(teacher_names)], "LH-301", "lecture"),
            ("11:30 AM", "12:30 PM", subject_names[3 % len(subject_names)], teacher_names[3 % len(teacher_names)], "LH-301", "lecture"),
            ("02:00 PM", "03:30 PM", f"{branch} Technical Seminar", teacher_names[0 % len(teacher_names)], "Auditorium", "lecture"),
        ],
        "Thursday": [
            ("09:00 AM", "10:00 AM", subject_names[0 % len(subject_names)], teacher_names[0 % len(teacher_names)], "LH-301", "lecture"),
            ("10:15 AM", "11:15 AM", subject_names[1 % len(subject_names)], teacher_names[1 % len(teacher_names)], "LH-301", "lecture"),
            ("11:30 AM", "12:30 PM", subject_names[2 % len(subject_names)], teacher_names[2 % len(teacher_names)], "LH-301", "lecture"),
            ("01:30 PM", "03:30 PM", f"{subject_names[0 % len(subject_names)]} Project Workshop", teacher_names[1 % len(teacher_names)], "Innovation Lab", "practical"),
        ],
        "Friday": [
            ("09:00 AM", "10:00 AM", subject_names[1 % len(subject_names)], teacher_names[1 % len(teacher_names)], "LH-301", "lecture"),
            ("10:15 AM", "11:15 AM", subject_names[2 % len(subject_names)], teacher_names[2 % len(teacher_names)], "LH-301", "lecture"),
            ("11:30 AM", "12:30 PM", subject_names[3 % len(subject_names)], teacher_names[3 % len(teacher_names)], "LH-301", "lecture"),
            ("02:00 PM", "04:00 PM", f"Special Guest Lecture ({branch})", "Visiting Industry Specialist", "Seminar Hall", "guest_lecture"),
        ],
        "Saturday": [
            ("09:30 AM", "11:00 AM", f"{branch} Capstone & Project Mentorship", teacher_names[0 % len(teacher_names)], "Innovation Hub", "practical"),
            ("11:15 AM", "01:00 PM", "Student Open Forum & Seminar", "Department Faculty Panel", "Main Hall", "practical"),
        ]
    }

    idx = 1
    for day, slots in sample_data.items():
        for st_t, end_t, subj, teacher, room, stype in slots:
            slot = models.TimetableSlot(
                branch=branch,
                semester=semester,
                section=section,
                day_of_week=day,
                slot_index=idx,
                start_time=st_t,
                end_time=end_t,
                custom_subject_name=subj,
                custom_teacher_name=teacher,
                room_number=room,
                session_type=stype
            )
            db.add(slot)
            idx += 1
    db.commit()
