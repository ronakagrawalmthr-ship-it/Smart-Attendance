from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Enum, ARRAY
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

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

    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False)

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String)
    roll_number = Column(String, unique=True, index=True)
    branch = Column(String)
    semester = Column(Integer)
    section = Column(String)
    
    # Store face vector as a simple string or Array if using pgvector in Postgres
    # For now, we represent it as a generic column (e.g., String/Text) to store serialized array
    face_encoding = Column(String, nullable=True) 
    phone = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)

    user = relationship("User", back_populates="student_profile")
    attendance_records = relationship("AttendanceLog", back_populates="student")

class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String)
    department = Column(String)

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
    branch = Column(String)
    semester = Column(Integer, nullable=True)
    section = Column(String, nullable=True) # Specific section or batch
    conducted_by_name = Column(String, nullable=True) # Faculty name or Guest Speaker name
    custom_subject_name = Column(String, nullable=True) # Custom topic or Guest Lecture title
    notes = Column(String, nullable=True) # e.g. "Lecture 2 of the day", "Guest Lecture on AI"
    
    teacher = relationship("TeacherProfile", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    attendance_logs = relationship("AttendanceLog", back_populates="session")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"))
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_present = Column(Boolean, default=True)
    status_tag = Column(String, default="PRESENT")  # "PRESENT", "ABSENT", "DUTY_LEAVE", "MEDICAL"
    remarks = Column(String, nullable=True)

    session = relationship("AcademicSession", back_populates="attendance_logs")
    student = relationship("StudentProfile", back_populates="attendance_records")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    ip_address = Column(String, nullable=True)
    device_info = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
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
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("StudentProfile")

class ParentNotificationLog(Base):
    __tablename__ = "parent_notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=True)
    student_roll = Column(String, nullable=True)
    student_name = Column(String, nullable=True)
    parent_phone = Column(String, nullable=True)
    channel = Column(String, default="WhatsApp")  # "WhatsApp", "SMS", "Email"
    trigger_reason = Column(String)               # "3 Consecutive Missed Classes", "Defaulter Warning (<75%)"
    message_content = Column(String)
    status = Column(String, default="Delivered")  # "Delivered", "Sent", "Queued"
    timestamp = Column(DateTime, default=datetime.utcnow)

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
    department = Column(String, default="all")  # "all" or specific e.g. "Computer Science"
    description = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

    original_teacher = relationship("TeacherProfile", foreign_keys=[original_teacher_id])
    proxy_teacher = relationship("TeacherProfile", foreign_keys=[proxy_teacher_id])
    subject = relationship("Subject")



