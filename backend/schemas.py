from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
try:
    from .models import RoleEnum, SessionType
except (ImportError, ValueError):
    from models import RoleEnum, SessionType

class UserBase(BaseModel):
    email: str
    role: RoleEnum

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class StudentProfileBase(BaseModel):
    full_name: str
    roll_number: str
    branch: str
    semester: int
    section: str
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    parent_email: Optional[str] = None
    photo_thumbnail: Optional[str] = None

class StudentProfileCreate(StudentProfileBase):
    user_id: int
    # In a real scenario, this would come from the selfie upload
    face_encoding: Optional[str] = None

class StudentProfile(StudentProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    alert_threshold: Optional[int] = None
    email_alerts: Optional[bool] = None
    sms_alerts: Optional[bool] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
