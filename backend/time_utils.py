from datetime import datetime, timezone, timedelta
from typing import Optional

import os

# Indian Standard Time (UTC + 05:30) - College and Institutional Standard Timezone
# Configurable via TIMEZONE_OFFSET_HOURS (default 5.5) for multi-region deployments
try:
    _offset_hours = float(os.getenv("TIMEZONE_OFFSET_HOURS", 5.5))
    _offset_minutes = int((_offset_hours % 1) * 60)
    IST = timezone(timedelta(hours=int(_offset_hours), minutes=_offset_minutes))
except Exception:
    IST = timezone(timedelta(hours=5, minutes=30))

def now_ist() -> datetime:
    """Returns current datetime in Indian Standard Time (timezone-aware)"""
    return datetime.now(IST)

def now_ist_naive() -> datetime:
    """Returns current datetime in Indian Standard Time as naive datetime for DB storage"""
    return datetime.now(IST).replace(tzinfo=None)

def today_ist_str() -> str:
    """Returns today's date string 'YYYY-MM-DD' in Indian Standard Time"""
    return datetime.now(IST).strftime("%Y-%m-%d")

def today_ist_date():
    """Returns today's date object in Indian Standard Time"""
    return datetime.now(IST).date()

def today_ist_day_name() -> str:
    """Returns today's day of week name (e.g. 'Monday', 'Wednesday') in IST"""
    return datetime.now(IST).strftime("%A")

def format_time_ist(dt: Optional[datetime] = None, fmt: str = "%I:%M %p") -> str:
    """Formats a datetime in Indian Standard Time (12-hour AM/PM)"""
    if dt is None:
        return datetime.now(IST).strftime(fmt)
    if dt.tzinfo is not None:
        return dt.astimezone(IST).strftime(fmt)
    return dt.strftime(fmt)

def format_datetime_ist(dt: Optional[datetime] = None, fmt: str = "%Y-%m-%d %I:%M:%S %p") -> str:
    """Formats a datetime with full date and 12-hour AM/PM in IST"""
    if dt is None:
        return datetime.now(IST).strftime(fmt)
    if dt.tzinfo is not None:
        return dt.astimezone(IST).strftime(fmt)
    return dt.strftime(fmt)

