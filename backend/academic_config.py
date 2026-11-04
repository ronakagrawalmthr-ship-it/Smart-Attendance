"""
Academic Programs & Course Duration Configuration
Dynamic multi-degree institutional structure supporting variable duration programs:
- 5 Years (10 Semesters): MBBS, B.Arch, BA LLB, Integrated M.Tech, BAMS, BDS
- 4 Years (8 Semesters): B.Tech, B.E., B.Pharm, B.Des, B.Sc (Hons)
- 3 Years (6 Semesters): BBA, BCA, B.Sc, B.Com, B.A., Polytechnic Diploma
- 2 Years (4 Semesters): MBA, M.Tech, MCA, M.Sc, M.Com, M.A., LLM
- 1 Year (2 Semesters): PG Diploma, Certificates
"""

import json
import re
from typing import Dict, Any, List, Optional

STANDARD_PROGRAM_CATALOG = {
    "mbbs": {
        "code": "MBBS",
        "name": "Bachelor of Medicine & Bachelor of Surgery",
        "duration_years": 5,
        "total_semesters": 10,
        "keywords": ["mbbs", "medicine", "medical", "bams", "bhms", "bds"]
    },
    "barch": {
        "code": "BARCH",
        "name": "Bachelor of Architecture",
        "duration_years": 5,
        "total_semesters": 10,
        "keywords": ["b.arch", "barch", "architecture"]
    },
    "ballb": {
        "code": "BALLB",
        "name": "Integrated Law (BA LLB / BBA LLB)",
        "duration_years": 5,
        "total_semesters": 10,
        "keywords": ["ba llb", "bba llb", "ballb", "bballb", "integrated law", "law (5", "law(5"]
    },
    "integrated_mtech": {
        "code": "INT_MTECH",
        "name": "Integrated Dual Degree (B.Tech + M.Tech)",
        "duration_years": 5,
        "total_semesters": 10,
        "keywords": ["integrated mtech", "integrated b.tech", "dual degree", "dd mtech", "5 year"]
    },
    "btech": {
        "code": "BTECH",
        "name": "Bachelor of Technology / Engineering",
        "duration_years": 4,
        "total_semesters": 8,
        "keywords": [
            "b.tech", "btech", "b.e", "be", "engineering", "cse", "computer science",
            "information technology", "ece", "electronics", "mech", "mechanical",
            "civil", "electrical", "ai/ml", "data science", "aids", "aiml", "chemical"
        ]
    },
    "bpharm": {
        "code": "BPHARM",
        "name": "Bachelor of Pharmacy",
        "duration_years": 4,
        "total_semesters": 8,
        "keywords": ["b.pharm", "bpharm", "pharmacy"]
    },
    "bdes": {
        "code": "BDES",
        "name": "Bachelor of Design",
        "duration_years": 4,
        "total_semesters": 8,
        "keywords": ["b.des", "bdes", "design"]
    },
    "bba": {
        "code": "BBA",
        "name": "Bachelor of Business Administration",
        "duration_years": 3,
        "total_semesters": 6,
        "keywords": ["bba", "business administration", "management studies", "bms", "bba(hons)"]
    },
    "bca": {
        "code": "BCA",
        "name": "Bachelor of Computer Applications",
        "duration_years": 3,
        "total_semesters": 6,
        "keywords": ["bca", "computer applications"]
    },
    "bsc": {
        "code": "BSC",
        "name": "Bachelor of Science",
        "duration_years": 3,
        "total_semesters": 6,
        "keywords": ["b.sc", "bsc", "bachelor of science"]
    },
    "bcom": {
        "code": "BCOM",
        "name": "Bachelor of Commerce",
        "duration_years": 3,
        "total_semesters": 6,
        "keywords": ["b.com", "bcom", "commerce", "accounting", "finance"]
    },
    "ba": {
        "code": "BA",
        "name": "Bachelor of Arts",
        "duration_years": 3,
        "total_semesters": 6,
        "keywords": ["b.a.", "bachelor of arts", "humanities", "economics", "english literature"]
    },
    "diploma": {
        "code": "DIPLOMA",
        "name": "Polytechnic Diploma",
        "duration_years": 3,
        "total_semesters": 6,
        "keywords": ["diploma", "polytechnic"]
    },
    "mba": {
        "code": "MBA",
        "name": "Master of Business Administration",
        "duration_years": 2,
        "total_semesters": 4,
        "keywords": ["mba", "master of business administration", "pgdm"]
    },
    "mtech": {
        "code": "MTECH",
        "name": "Master of Technology",
        "duration_years": 2,
        "total_semesters": 4,
        "keywords": ["m.tech", "mtech", "m.e", "me", "master of engineering"]
    },
    "mca": {
        "code": "MCA",
        "name": "Master of Computer Applications",
        "duration_years": 2,
        "total_semesters": 4,
        "keywords": ["mca", "master of computer applications"]
    },
    "msc": {
        "code": "MSC",
        "name": "Master of Science",
        "duration_years": 2,
        "total_semesters": 4,
        "keywords": ["m.sc", "msc", "master of science"]
    },
    "mcom": {
        "code": "MCOM",
        "name": "Master of Commerce",
        "duration_years": 2,
        "total_semesters": 4,
        "keywords": ["m.com", "mcom", "master of commerce"]
    },
    "ma": {
        "code": "MA",
        "name": "Master of Arts",
        "duration_years": 2,
        "total_semesters": 4,
        "keywords": ["m.a.", "master of arts"]
    },
    "pg_diploma": {
        "code": "PGDIP",
        "name": "Postgraduate Diploma",
        "duration_years": 1,
        "total_semesters": 2,
        "keywords": ["pg diploma", "post graduate diploma", "pgd"]
    }
}

DEFAULT_PROGRAM = {
    "code": "BTECH",
    "name": "Undergraduate Degree",
    "duration_years": 4,
    "total_semesters": 8,
    "keywords": []
}

SETTING_KEY_CUSTOM_PROGRAMS = "academic_program_overrides"


def get_custom_overrides(db=None) -> Dict[str, Any]:
    """Fetch custom program configuration overrides from database if available."""
    if not db:
        return {}
    try:
        try:
            from .models import SystemSetting
        except (ImportError, ValueError):
            from models import SystemSetting
        setting = db.query(SystemSetting).filter(SystemSetting.key == SETTING_KEY_CUSTOM_PROGRAMS).first()
        if setting and setting.value:
            return json.loads(setting.value)
    except Exception:
        pass
    return {}


def _format_program_meta(prog_info: Dict[str, Any], branch_name: str = "") -> Dict[str, Any]:
    years = prog_info.get("duration_years", 4)
    total_sems = prog_info.get("total_semesters", years * 2)
    b_lower = (branch_name or "").lower()
    if any(k in b_lower for k in ["cse", "computer science", "it", "information technology"]):
        default_secs = ["A", "B", "C", "D"]
    elif any(k in b_lower for k in ["mbbs", "bams", "bds"]):
        default_secs = ["A"]
    elif any(k in b_lower for k in ["mech", "civil", "electrical", "mba", "bsc", "bcom"]):
        default_secs = ["A", "B"]
    else:
        default_secs = ["A", "B", "C"]
    return {
        "program_code": prog_info.get("code", "UG"),
        "program_name": prog_info.get("name", "Degree Program"),
        "duration_years": years,
        "total_semesters": total_sems,
        "semesters": list(range(1, total_sems + 1)),
        "sections": prog_info.get("sections", default_secs),
        "graduation_semester": total_sems,
        "alumni_semester_tag": total_sems + 1,
        "branch_matched": branch_name or prog_info.get("code", "General")
    }


def resolve_program_meta(branch_or_dept: Optional[str], db=None, custom_overrides: Optional[Dict[str, Any]] = None, dept_map: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Intelligently determines the degree program, duration in years, and total semesters
    from a branch/department name or course title.
    
    Examples:
    - "BBA" -> 3 Years, 6 Semesters
    - "MBBS" -> 5 Years, 10 Semesters
    - "MBA" -> 2 Years, 4 Semesters
    - "Computer Science and Engineering" -> 4 Years, 8 Semesters
    - "B.Sc Physics" -> 3 Years, 6 Semesters
    - "M.Tech AI" -> 2 Years, 4 Semesters
    - "BA LLB (Hons)" -> 5 Years, 10 Semesters
    """
    if not branch_or_dept:
        return _format_program_meta(DEFAULT_PROGRAM)

    raw_text = branch_or_dept.strip()
    norm_text = raw_text.lower()

    # 0. Check explicit Department model configured by Admin (with optional cache map)
    if dept_map is not None or db:
        try:
            try:
                from .models import Department
            except (ImportError, ValueError):
                from models import Department
            if dept_map is not None:
                dept = dept_map.get(norm_text)
            else:
                dept = db.query(Department).filter(
                    (Department.name.ilike(raw_text)) | (Department.code.ilike(raw_text))
                ).first()
            if dept:
                years = dept.duration_years or 4
                total_sems = dept.total_semesters or (years * 2)
                raw_secs = getattr(dept, "sections", None)
                secs_list = [s.strip().upper() for s in raw_secs.split(",") if s.strip()] if raw_secs else ["A", "B", "C"]
                return {
                    "program_code": dept.code,
                    "program_name": dept.name,
                    "duration_years": years,
                    "total_semesters": total_sems,
                    "degree_type": getattr(dept, "degree_type", "UG"),
                    "semesters": list(range(1, total_sems + 1)),
                    "sections": secs_list or ["A", "B", "C"],
                    "graduation_semester": total_sems,
                    "alumni_semester_tag": total_sems + 1,
                    "branch_matched": dept.name
                }
        except Exception:
            pass

    # 1. Check custom overrides from system_settings (with optional pre-fetched cache)
    if custom_overrides is None:
        custom_overrides = get_custom_overrides(db)
    if custom_overrides:
        # Exact branch match
        for key, conf in custom_overrides.items():
            if key.lower() == norm_text:
                years = conf.get("duration_years", 4)
                total_sems = conf.get("total_semesters", years * 2)
                return {
                    "program_code": conf.get("code", key.upper()),
                    "program_name": conf.get("name", raw_text),
                    "duration_years": years,
                    "total_semesters": total_sems,
                    "semesters": list(range(1, total_sems + 1)),
                    "graduation_semester": total_sems,
                    "alumni_semester_tag": total_sems + 1,
                    "branch_matched": raw_text
                }

    # 2. Check Degree Prefix / Primary Qualification token matches first
    # This prevents specializations (e.g. "MBA - Finance") from mistakenly matching "Finance" under B.Com.
    degree_priority_order = [
        # 5-Year degrees
        ("mbbs", ["mbbs", "medicine", "medical", "bams", "bhms", "bds"]),
        ("ballb", ["ba llb", "bba llb", "ballb", "bballb", "integrated law", "law (5", "law(5"]),
        ("barch", ["b.arch", "barch", "architecture"]),
        ("integrated_mtech", ["integrated mtech", "integrated b.tech", "dual degree", "dd mtech"]),
        
        # 2-Year Master's degrees
        ("mba", ["mba", "pgdm", "master of business administration"]),
        ("mtech", ["m.tech", "mtech", "m.e.", "master of technology", "master of engineering"]),
        ("mca", ["mca", "master of computer applications"]),
        ("msc", ["m.sc", "msc", "master of science"]),
        ("mcom", ["m.com", "mcom", "master of commerce"]),
        ("ma", ["m.a.", "master of arts"]),
        
        # 3-Year Bachelor's degrees & Diploma
        ("bba", ["bba", "business administration", "management studies", "bms"]),
        ("bca", ["bca", "computer applications"]),
        ("bsc", ["b.sc", "bsc", "bachelor of science"]),
        ("bcom", ["b.com", "bcom", "commerce"]),
        ("diploma", ["diploma", "polytechnic"]),
        ("ba", ["b.a.", "bachelor of arts"]),
        
        # 4-Year Bachelor's degrees (Engineering, Pharmacy, Design)
        ("bpharm", ["b.pharm", "bpharm", "pharmacy"]),
        ("bdes", ["b.des", "bdes", "design"]),
        ("btech", [
            "b.tech", "btech", "b.e", "be", "engineering", "cse", "computer science",
            "information technology", "ece", "electronics", "mech", "mechanical",
            "civil", "electrical", "ai/ml", "data science", "aids", "aiml", "chemical"
        ]),
        
        # 1-Year / Misc
        ("pg_diploma", ["pg diploma", "post graduate diploma", "pgd"]),
    ]

    matched_entry = None
    for prog_key, kw_list in degree_priority_order:
        info = STANDARD_PROGRAM_CATALOG.get(prog_key)
        if not info:
            continue
        for kw in kw_list:
            # Word boundary search
            pattern = r'(?:^|[\s\-_/,\.\(])' + re.escape(kw) + r'(?:$|[\s\-_/,\.\)])'
            if re.search(pattern, norm_text):
                matched_entry = info
                break
        if matched_entry:
            break

    # 3. Fallback: Substring search across all catalog entries if word boundary was missed
    if not matched_entry:
        for prog_key, kw_list in degree_priority_order:
            info = STANDARD_PROGRAM_CATALOG.get(prog_key)
            if not info:
                continue
            for kw in kw_list:
                if kw in norm_text:
                    matched_entry = info
                    break
            if matched_entry:
                break

    target = matched_entry or DEFAULT_PROGRAM
    return _format_program_meta(target, raw_text)



def get_program_total_semesters(branch_or_dept: Optional[str], db=None) -> int:
    """Helper returning only the total semesters integer."""
    meta = resolve_program_meta(branch_or_dept, db)
    return meta["total_semesters"]


def get_all_supported_programs() -> List[Dict[str, Any]]:
    """Returns catalog of all standard degree programs."""
    result = []
    for k, v in STANDARD_PROGRAM_CATALOG.items():
        result.append({
            "key": k,
            "code": v["code"],
            "name": v["name"],
            "duration_years": v["duration_years"],
            "total_semesters": v["total_semesters"],
            "semesters": list(range(1, v["total_semesters"] + 1))
        })
    return result


def calculate_attendance_ia_marks(attendance_pct: float) -> Dict[str, Any]:
    """
    Standard Indian University & AICTE Continuous Internal Assessment (CIA) Attendance Weightage:
    - >= 90.0%: 5 / 5 Marks (Exemplary Standing)
    - 85.0% - 89.9%: 4 / 5 Marks (Very Good Standing)
    - 80.0% - 84.9%: 3 / 5 Marks (Good Standing)
    - 75.0% - 79.9%: 2 / 5 Marks (Satisfactory Standing / Exam Eligible)
    - 65.0% - 74.9%: 0 / 5 Marks (Amber Condonation Zone - Requires Medical / OD Verification)
    - < 65.0%: 0 / 5 Marks (Critical Detention / Exam Debarment Zone)
    """
    pct = round(float(attendance_pct or 0.0), 1)
    if pct >= 90.0:
        marks = 5
        standing = "Exemplary"
        color = "emerald"
        tier = "GREEN"
        condonation_eligible = False
        debarment_risk = False
        description = "Full 5/5 Internal Assessment credit awarded. Direct exam hall ticket eligibility."
    elif pct >= 85.0:
        marks = 4
        standing = "Very Good"
        color = "emerald"
        tier = "GREEN"
        condonation_eligible = False
        debarment_risk = False
        description = "4/5 Internal Assessment credit awarded. Safe exam standing."
    elif pct >= 80.0:
        marks = 3
        standing = "Good"
        color = "emerald"
        tier = "GREEN"
        condonation_eligible = False
        debarment_risk = False
        description = "3/5 Internal Assessment credit awarded. Safe exam standing."
    elif pct >= 75.0:
        marks = 2
        standing = "Satisfactory"
        color = "teal"
        tier = "GREEN"
        condonation_eligible = False
        debarment_risk = False
        description = "2/5 Internal Assessment credit awarded. Meets AICTE/UGC 75% minimum statutory threshold."
    elif pct >= 65.0:
        marks = 0
        standing = "Condonation Eligible"
        color = "amber"
        tier = "AMBER"
        condonation_eligible = True
        debarment_risk = True
        description = "Attendance deficit (65-74%). Eligible for 10% HOD Condonation waiver upon valid Medical/OD submission."
    else:
        marks = 0
        standing = "Critical Detention Risk"
        color = "rose"
        tier = "RED"
        condonation_eligible = False
        debarment_risk = True
        description = "Severe attendance shortage (<65%). AICTE/UGC statutory debarment from semester university examinations."

    return {
        "attendance_percentage": pct,
        "ia_marks": marks,
        "max_ia_marks": 5,
        "standing": standing,
        "color": color,
        "tier": tier,
        "condonation_eligible": condonation_eligible,
        "debarment_risk": debarment_risk,
        "description": description
    }
