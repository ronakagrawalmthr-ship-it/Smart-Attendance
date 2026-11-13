from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Enum, ARRAY, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
try:
    from .time_utils import now_ist_naive
except (ImportError, ValueError):
    from time_utils import now_ist_naive

try:
    from .database import Base
except (ImportError, ValueError):
    from database import Base

class RoleEnum(str, enum.Enum):
    admin = "admin"
    hod = "hod"
    teacher = "teacher"
    student = "student"

class SessionType(str, enum.Enum):
    lecture = "lecture"
    practical = "practical"
    test = "test"
    guest_lecture = "guest_lecture"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(RoleEnum))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)

    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False)

class EmailVerificationOTP(Base):
    __tablename__ = "email_verification_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    purpose = Column(String, default="registration")
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False)
    sub_batch = Column(String, default="All") # "All" or "A1", "A2", "A3"
    created_at = Column(DateTime, default=now_ist_naive)

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String)
    roll_number = Column(String, unique=True, index=True)
    branch = Column(String)
    semester = Column(Integer)
    section = Column(String)
    
    # Store face vector as AES-256 encrypted string (DPDP Act 2023 compliance)
    face_encoding = Column(String, nullable=True) 
    biometric_consent = Column(Boolean, default=False)
    consent_timestamp = Column(DateTime, nullable=True)
    phone = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    parent_email = Column(String, nullable=True)  # Guardian email for automated attendance alerts
    photo_thumbnail = Column(String, nullable=True)  # Compressed base64 JPEG (80x80) for avatar display
    sub_batch = Column(String, default="A1")         # Sub-batch for Labs: A1, A2, A3
    mentor_name = Column(String, nullable=True)      # Faculty Proctor / Mentor

    user = relationship("User", back_populates="student_profile")
    attendance_records = relationship("AttendanceLog", back_populates="student")

class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String)
    department = Column(String)
    phone_number = Column(String, nullable=True)

    user = relationship("User", back_populates="teacher_profile")
    sessions = relationship("AcademicSession", back_populates="teacher")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    name = Column(String)
    branch = Column(String)
    semester = Column(Integer)
    
    sessions = relationship("AcademicSession", back_populates="subject")

class AcademicSession(Base):
    __tablename__ = "academic_sessions"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teacher_profiles.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    session_type = Column(Enum(SessionType), default=SessionType.lecture)
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=60)
    credit_weight = Column(Integer, default=1)
    branch = Column(String)
    semester = Column(Integer, nullable=True)
    section = Column(String, nullable=True) # Specific section or batch
    conducted_by_name = Column(String, nullable=True) # Faculty name or Guest Speaker name
    custom_subject_name = Column(String, nullable=True) # Custom topic or Guest Lecture title
    notes = Column(String, nullable=True) # e.g. "Lecture 2 of the day", "Guest Lecture on AI"
    sub_batch = Column(String, default="All") # "All" or specific Lab batch: "A1", "A2", "A3"
    
    teacher = relationship("TeacherProfile", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    attendance_logs = relationship("AttendanceLog", back_populates="session")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    __table_args__ = (
        UniqueConstraint('session_id', 'student_id', name='uq_session_student'),
    )

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"))
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    timestamp = Column(DateTime, default=now_ist_naive)
    is_present = Column(Boolean, default=True)
    status_tag = Column(String, default="PRESENT")  # "PRESENT", "ABSENT", "DUTY_LEAVE", "MEDICAL"
    remarks = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)  # Real face-match confidence % (0.0-100.0)

    session = relationship("AcademicSession", back_populates="attendance_logs")
    student = relationship("StudentProfile", back_populates="attendance_records")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    ip_address = Column(String, nullable=True)
    device_info = Column(String, nullable=True)
    timestamp = Column(DateTime, default=now_ist_naive)
    
    user = relationship("User")

class Grievance(Base):
    __tablename__ = "grievances"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=True)
    subject_name = Column(String, default="General Attendance")
    reason = Column(String)
    status = Column(String, default="Pending HOD Decision")
    document_url = Column(String, nullable=True)
    document_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

    student = relationship("StudentProfile")

class ParentNotificationLog(Base):
    __tablename__ = "parent_notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True, nullable=True) # e.g. "student_12:2026-10-28:Defaulter Warning (<75%)"
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=True)
    student_roll = Column(String, nullable=True)
    student_name = Column(String, nullable=True)
    parent_phone = Column(String, nullable=True)
    parent_email = Column(String, nullable=True)
    recipient = Column(String, nullable=True)
    channel = Column(String, default="Email")  # "Email", "SMS", "WhatsApp" 
    trigger_reason = Column(String)               # "3 Consecutive Missed Classes", "Defaulter Warning (<75%)"
    message_content = Column(String)
    status = Column(String, default="Delivered")  # "Delivered", "Sent", "Queued"
    timestamp = Column(DateTime, default=now_ist_naive)

    student = relationship("StudentProfile")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)  # Stores JSON serialized settings

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date = Column(String, index=True)  # YYYY-MM-DD
    end_date = Column(String, nullable=True, index=True)  # YYYY-MM-DD (For multi-day Preparation Leave / Exam Breaks)
    event_type = Column(String, default="HOLIDAY")  # HOLIDAY, PREPARATION_LEAVE, EXAM_PERIOD, SEMESTER_BREAK, EMERGENCY_CLOSURE
    department = Column(String, default="all")  # "all" or specific e.g. "Computer Science"
    description = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

class ProxyAssignment(Base):
    __tablename__ = "proxy_assignments"

    id = Column(Integer, primary_key=True, index=True)
    original_teacher_id = Column(Integer, ForeignKey("teacher_profiles.id"))
    proxy_teacher_id = Column(Integer, ForeignKey("teacher_profiles.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    date = Column(String, index=True)  # YYYY-MM-DD
    reason = Column(String, nullable=True)
    status = Column(String, default="Active")
    assigned_by = Column(String)
    created_at = Column(DateTime, default=now_ist_naive)

    original_teacher = relationship("TeacherProfile", foreign_keys=[original_teacher_id])
    proxy_teacher = relationship("TeacherProfile", foreign_keys=[proxy_teacher_id])
    subject = relationship("Subject")

class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    branch = Column(String, index=True)          # e.g. "Computer Science & Engineering"
    semester = Column(Integer, index=True)        # 1-8
    section = Column(String, index=True)          # "A", "B", "C"
    day_of_week = Column(String, index=True)      # "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    slot_index = Column(Integer, default=1)       # 1 to 8
    start_time = Column(String)                   # "09:00 AM"
    end_time = Column(String)                     # "10:00 AM"
    duration_minutes = Column(Integer, default=60) # 50, 60, 100, 120, 180 (Lab blocks)
    credit_weight = Column(Integer, default=1)    # 1 lecture unit, 2 or 3 for lab blocks
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    custom_subject_name = Column(String, nullable=True)
    teacher_id = Column(Integer, ForeignKey("teacher_profiles.id"), nullable=True)
    custom_teacher_name = Column(String, nullable=True)
    room_number = Column(String, default="LH-101")
    session_type = Column(String, default="lecture") # lecture, practical, tutorial
    sub_batch = Column(String, default="All")        # "All" or specific Lab batch: "A1", "A2", "A3"
    created_at = Column(DateTime, default=now_ist_naive)

    subject = relationship("Subject")
    teacher = relationship("TeacherProfile")

class DevicePushToken(Base):
    __tablename__ = "device_push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    token = Column(String, unique=True, index=True) # e.g. "ExponentPushToken[...]"
    platform = Column(String, default="expo")       # "expo", "web", "ios", "android"
    device_name = Column(String, nullable=True)     # "iPhone 15", "Pixel 8", etc.
    updated_at = Column(DateTime, default=now_ist_naive)

    user = relationship("User")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False) # e.g. "CSE", "BBA", "MBBS", "MECH"
    name = Column(String, unique=True, index=True, nullable=False) # e.g. "Computer Science & Engineering"
    degree_type = Column(String, default="UG")                     # "UG", "PG", "Diploma", "Integrated", "Doctorate"
    duration_years = Column(Integer, default=4)                    # e.g. 1 to 6
    total_semesters = Column(Integer, default=8)                   # e.g. 2 to 12
    sections = Column(String, default="A, B, C")                   # e.g. "A, B", "A, B, C, D" or custom
    hod_name = Column(String, nullable=True)
    hod_email = Column(String, nullable=True)
    hod_phone = Column(String, nullable=True)
    color = Column(String, default="from-emerald-500 to-teal-600")
    rank = Column(String, default="Academic Faculty")
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

