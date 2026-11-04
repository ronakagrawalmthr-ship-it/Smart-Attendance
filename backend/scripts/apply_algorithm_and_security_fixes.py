import re
from pathlib import Path

backend_dir = Path("backend")

# ==============================================================================
# 1. FIX AUTH.PY (Remove demo password bypasses)
# ==============================================================================
auth_py_path = backend_dir / "routers" / "auth.py"
auth_code = auth_py_path.read_text(encoding="utf-8")

old_verify_func = """def verify_user_password(plain_password: str, user: models.User, db: Session = None) -> bool:
    if not plain_password:
        return False

    # Primary secure check: verify strictly against stored bcrypt hash
    if user.hashed_password and security.verify_password(plain_password, user.hashed_password):
        return True

    # High-usability institutional fallbacks for demo & standard environments
    pwd_clean = plain_password.strip()
    
    if user.role == models.RoleEnum.student:
        if pwd_clean in ["student123", "studentpassword", "student"]:
            return True
        if user.student_profile:
            roll = (user.student_profile.roll_number or "").strip()
            if roll and pwd_clean.upper() == roll.upper():
                return True

    elif user.role == models.RoleEnum.admin:
        if pwd_clean in ["admin123", "adminpassword", "admin"]:
            return True

    elif user.role == models.RoleEnum.hod:
        if pwd_clean in ["hod123", "hodpassword", "hod"]:
            return True

    elif user.role == models.RoleEnum.teacher:
        if pwd_clean in ["faculty123", "teacher123", "faculty", "teacher"]:
            return True

    return False"""

new_verify_func = """def verify_user_password(plain_password: str, user: models.User, db: Session = None) -> bool:
    if not plain_password:
        return False

    # Primary secure check: verify strictly against stored bcrypt hash
    if user.hashed_password and security.verify_password(plain_password, user.hashed_password):
        return True

    # Zero backdoor policy: If account has a hashed password configured, no fallback passwords allowed
    if user.hashed_password:
        return False

    # For newly created student accounts without an explicit password set, allow uppercase roll number
    pwd_clean = plain_password.strip()
    if user.role == models.RoleEnum.student and user.student_profile:
        roll = (user.student_profile.roll_number or "").strip()
        if roll and pwd_clean.upper() == roll.upper():
            return True

    return False"""

auth_code_norm = auth_code.replace("\r\n", "\n")
old_verify_norm = old_verify_func.replace("\r\n", "\n")
new_verify_norm = new_verify_func.replace("\r\n", "\n")

if old_verify_norm in auth_code_norm:
    auth_code_norm = auth_code_norm.replace(old_verify_norm, new_verify_norm)
    auth_py_path.write_text(auth_code_norm, encoding="utf-8")
    print("[OK] Updated verify_user_password in auth.py: Zero Backdoors Active")
else:
    print("[NOTE] verify_user_password target block not found in auth.py")


# ==============================================================================
# 2. FIX TIMETABLE.PY (Timezone IST & Disable Auto-seed on Empty Class)
# ==============================================================================
tt_path = backend_dir / "routers" / "timetable.py"
tt_code = tt_path.read_text(encoding="utf-8")
tt_code_norm = tt_code.replace("\r\n", "\n")

# Ensure now_ist_naive is imported
if "from ..time_utils import today_ist_day_name, today_ist_str" in tt_code_norm:
    tt_code_norm = tt_code_norm.replace(
        "from ..time_utils import today_ist_day_name, today_ist_str",
        "from ..time_utils import today_ist_day_name, today_ist_str, now_ist_naive"
    )

if "from time_utils import today_ist_day_name, today_ist_str" in tt_code_norm:
    tt_code_norm = tt_code_norm.replace(
        "from time_utils import today_ist_day_name, today_ist_str",
        "from time_utils import today_ist_day_name, today_ist_str, now_ist_naive"
    )

# Fix lines in get_weekly_timetable
old_weekly_seed = """    # If no slots exist yet, auto-seed a realistic standard schedule for this class
    if not slots:
        seed_sample_timetable_for_class(branch, semester, section.upper(), db)
        slots = db.query(models.TimetableSlot).filter(
            models.TimetableSlot.branch == branch,
            models.TimetableSlot.semester == semester,
            models.TimetableSlot.section == section.upper()
        ).all()"""

new_weekly_clean = """    # Clean Production: If no slots exist yet, return empty list (No fake data auto-injected)
    if not slots:
        slots = []"""

if old_weekly_seed in tt_code_norm:
    tt_code_norm = tt_code_norm.replace(old_weekly_seed, new_weekly_clean)
    print("[OK] Removed auto-seed in get_weekly_timetable")

# Fix lines in get_today_schedule
old_today_seed = """    if not slots:
        seed_sample_timetable_for_class(branch, semester, (section or "A").upper(), db)
        slots = db.query(models.TimetableSlot).filter(
            models.TimetableSlot.branch == branch,
            models.TimetableSlot.semester == semester,
            models.TimetableSlot.section == (section or "A").upper(),
            models.TimetableSlot.day_of_week == effective_day
        ).all()

    # Calculate ongoing/upcoming status
    now = datetime.now()
    now_mins = now.hour * 60 + now.minute"""

new_today_clean = """    if not slots:
        slots = []

    # Calculate ongoing/upcoming status with exact Indian Standard Time (IST)
    now = now_ist_naive()
    now_mins = now.hour * 60 + now.minute"""

if old_today_seed in tt_code_norm:
    tt_code_norm = tt_code_norm.replace(old_today_seed, new_today_clean)
    print("[OK] Removed auto-seed & switched to now_ist_naive in get_today_schedule")

# Fix date strings in timetable.py
tt_code_norm = tt_code_norm.replace('today_str = datetime.now().strftime("%Y-%m-%d")', 'today_str = today_ist_str()')

tt_path.write_text(tt_code_norm, encoding="utf-8")
print("[OK] Saved timetable.py with IST and zero auto-seed")


# ==============================================================================
# 3. FIX MANAGEMENT.PY (Timezone IST for College Greetings & Analytics)
# ==============================================================================
mgmt_path = backend_dir / "routers" / "management.py"
mgmt_code = mgmt_path.read_text(encoding="utf-8")
mgmt_code_norm = mgmt_code.replace("\r\n", "\n")

old_mgmt_kpi = """    # Calculate dynamic greeting and period for college-wide executive overview
    now = datetime.now()
    hour = now.hour"""

new_mgmt_kpi = """    # Calculate dynamic greeting and period for college-wide executive overview (IST)
    now = now_ist_naive()
    hour = now.hour"""

if old_mgmt_kpi in mgmt_code_norm:
    mgmt_code_norm = mgmt_code_norm.replace(old_mgmt_kpi, new_mgmt_kpi)
    print("[OK] Synchronized college KPI greeting to now_ist_naive() in management.py")

old_hod_kpi = """    # 2. Compute dynamic time-of-day greeting and icon
    now = datetime.now()
    hour = now.hour"""

new_hod_kpi = """    # 2. Compute dynamic time-of-day greeting and icon (IST)
    now = now_ist_naive()
    hour = now.hour"""

if old_hod_kpi in mgmt_code_norm:
    mgmt_code_norm = mgmt_code_norm.replace(old_hod_kpi, new_hod_kpi)
    print("[OK] Synchronized HOD KPI greeting to now_ist_naive() in management.py")

mgmt_path.write_text(mgmt_code_norm, encoding="utf-8")
print("[OK] Saved management.py")


# ==============================================================================
# 4. SYNC SYSTEM SETTING IN DATABASE
# ==============================================================================
import sys
sys.path.insert(0, str(backend_dir))
import database
import models

db = next(database.get_db())
setting_email = db.query(models.SystemSetting).filter(models.SystemSetting.key == "admin_email").first()
if setting_email:
    setting_email.value = "spideronak@gmail.com"
else:
    db.add(models.SystemSetting(key="admin_email", value="spideronak@gmail.com"))

db.commit()
print("[OK] Updated SystemSetting admin_email to spideronak@gmail.com")

db.close()

