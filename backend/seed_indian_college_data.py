import os
import sys
from datetime import datetime, timedelta
import random

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models
import security

def seed_database():
    print("Starting Indian College Data Seeding...")
    db = SessionLocal()

    # Recreate tables to ensure clean schema
    Base.metadata.create_all(bind=engine)

    # 1. Clean existing records in dependency order
    print("Clearing legacy mock records...")
    db.query(models.AttendanceLog).delete()
    db.query(models.AcademicSession).delete()
    db.query(models.Grievance).delete()
    db.query(models.ParentNotificationLog).delete()
    db.query(models.ProxyAssignment).delete()
    db.query(models.AuditLog).delete()
    db.query(models.StudentProfile).delete()
    db.query(models.TeacherProfile).delete()
    db.query(models.Subject).delete()
    db.query(models.Holiday).delete()
    db.query(models.User).delete()
    db.commit()

    # --------------------------------------------------------------------------
    # 2. SEED CORE USERS & FACULTY (Indian Professors & HODs)
    # --------------------------------------------------------------------------
    print("Seeding institutional users and faculty...")

    # Admin User
    admin_user = models.User(
        email="admin@college.edu",
        hashed_password=security.get_password_hash("AdminPass123!"),
        role=models.RoleEnum.admin,
        is_active=True
    )
    db.add(admin_user)

    # Faculty definitions
    faculty_data = [
        {
            "email": "hod.cse@college.edu",
            "password": "HodPass123!",
            "role": models.RoleEnum.hod,
            "name": "Dr. Rajesh Sharma",
            "department": "Computer Science & Engineering",
            "designation": "HOD & Senior Professor"
        },
        {
            "email": "hod.it@college.edu",
            "password": "HodPass123!",
            "role": models.RoleEnum.hod,
            "name": "Dr. Sunita Verma",
            "department": "Information Technology",
            "designation": "HOD & Professor"
        },
        {
            "email": "hod.ece@college.edu",
            "password": "HodPass123!",
            "role": models.RoleEnum.hod,
            "name": "Dr. Amit Patel",
            "department": "Electronics & Communication",
            "designation": "HOD & Professor"
        },
        {
            "email": "hod.mech@college.edu",
            "password": "HodPass123!",
            "role": models.RoleEnum.hod,
            "name": "Dr. Vikram Malhotra",
            "department": "Mechanical Engineering",
            "designation": "HOD & Professor"
        },
        {
            "email": "teacher@college.edu",
            "password": "TeacherPass123!",
            "role": models.RoleEnum.teacher,
            "name": "Prof. Priya Nair",
            "department": "Computer Science & Engineering",
            "designation": "Associate Professor"
        },
        {
            "email": "manoj.joshi@college.edu",
            "password": "TeacherPass123!",
            "role": models.RoleEnum.teacher,
            "name": "Prof. Manoj Joshi",
            "department": "Computer Science & Engineering",
            "designation": "Assistant Professor"
        },
        {
            "email": "ananya.gupta@college.edu",
            "password": "TeacherPass123!",
            "role": models.RoleEnum.teacher,
            "name": "Prof. Ananya Gupta",
            "department": "Information Technology",
            "designation": "Assistant Professor"
        },
        {
            "email": "suresh.kumar@college.edu",
            "password": "TeacherPass123!",
            "role": models.RoleEnum.teacher,
            "name": "Prof. Suresh Kumar",
            "department": "Electronics & Communication",
            "designation": "Associate Professor"
        },
        {
            "email": "deepak.rao@college.edu",
            "password": "TeacherPass123!",
            "role": models.RoleEnum.teacher,
            "name": "Dr. Deepak Rao",
            "department": "Mechanical Engineering",
            "designation": "Associate Professor"
        },
        {
            "email": "kavita.reddy@college.edu",
            "password": "TeacherPass123!",
            "role": models.RoleEnum.teacher,
            "name": "Prof. Kavita Reddy",
            "department": "Computer Science & Engineering",
            "designation": "Assistant Professor"
        }
    ]

    teacher_profile_map = {}
    for f in faculty_data:
        u = models.User(
            email=f["email"],
            hashed_password=security.get_password_hash(f["password"]),
            role=f["role"],
            is_active=True
        )
        db.add(u)
        db.flush()

        tp = models.TeacherProfile(
            user_id=u.id,
            full_name=f["name"],
            department=f["department"]
        )
        db.add(tp)
        db.flush()
        teacher_profile_map[f["name"]] = tp

    # --------------------------------------------------------------------------
    # 3. SEED ACADEMIC SUBJECTS (Indian University Curriculum)
    # --------------------------------------------------------------------------
    print("Seeding academic curriculum subjects...")
    subjects_data = [
        # CSE
        {"code": "CS301", "name": "Machine Learning & AI", "branch": "Computer Science & Engineering", "semester": 6},
        {"code": "CS302", "name": "Database Management Systems", "branch": "Computer Science & Engineering", "semester": 6},
        {"code": "CS303", "name": "Computer Networks & Security", "branch": "Computer Science & Engineering", "semester": 6},
        {"code": "CS304", "name": "Operating Systems & Kernels", "branch": "Computer Science & Engineering", "semester": 6},
        {"code": "CS305", "name": "Design & Analysis of Algorithms", "branch": "Computer Science & Engineering", "semester": 6},
        # IT
        {"code": "IT301", "name": "Web Technologies & Frameworks", "branch": "Information Technology", "semester": 6},
        {"code": "IT302", "name": "Cloud Computing Architecture", "branch": "Information Technology", "semester": 6},
        {"code": "IT303", "name": "Cyber Security & Cryptography", "branch": "Information Technology", "semester": 6},
        # ECE
        {"code": "EC301", "name": "Digital Signal Processing", "branch": "Electronics & Communication", "semester": 6},
        {"code": "EC302", "name": "VLSI Design & Fabrication", "branch": "Electronics & Communication", "semester": 6},
        {"code": "EC303", "name": "Embedded Systems & IoT", "branch": "Electronics & Communication", "semester": 6},
        # MECH
        {"code": "ME301", "name": "Thermodynamics & Heat Transfer", "branch": "Mechanical Engineering", "semester": 6},
        {"code": "ME302", "name": "Fluid Mechanics & Turbo Machinery", "branch": "Mechanical Engineering", "semester": 6},
        {"code": "ME303", "name": "Manufacturing Processes", "branch": "Mechanical Engineering", "semester": 6},
    ]

    subject_objects = []
    for s in subjects_data:
        sub = models.Subject(
            code=s["code"],
            name=s["name"],
            branch=s["branch"],
            semester=s["semester"]
        )
        db.add(sub)
        db.flush()
        subject_objects.append(sub)

    # --------------------------------------------------------------------------
    # 4. SEED REALISTIC INDIAN STUDENTS (Across 4 Departments)
    # --------------------------------------------------------------------------
    print("Seeding student cohorts...")

    # Default student login account
    default_student_user = models.User(
        email="student@college.edu",
        hashed_password=security.get_password_hash("StudentPass123!"),
        role=models.RoleEnum.student,
        is_active=True
    )
    db.add(default_student_user)
    db.flush()

    default_student_prof = models.StudentProfile(
        user_id=default_student_user.id,
        full_name="Aarav Sharma",
        roll_number="23CSE001",
        branch="Computer Science & Engineering",
        semester=6,
        section="A",
        phone="+91 98765 01001",
        emergency_contact="+91 98765 02001"
    )
    db.add(default_student_prof)
    db.flush()

    # Roster of Indian Students per Department
    indian_students = [
        # CSE Students (Sem 6, Sec A & B)
        ("Diya Patel", "23CSE002", "Computer Science & Engineering", 6, "A", "+91 98765 01002"),
        ("Rohan Verma", "23CSE003", "Computer Science & Engineering", 6, "A", "+91 98765 01003"),
        ("Sneha Kulkarni", "23CSE004", "Computer Science & Engineering", 6, "A", "+91 98765 01004"),
        ("Aditya Gupta", "23CSE005", "Computer Science & Engineering", 6, "A", "+91 98765 01005"),
        ("Ananya Sen", "23CSE006", "Computer Science & Engineering", 6, "A", "+91 98765 01006"),
        ("Rahul Mehra", "23CSE007", "Computer Science & Engineering", 6, "A", "+91 98765 01007"), # Defaulter (<65%)
        ("Pooja Desai", "23CSE008", "Computer Science & Engineering", 6, "A", "+91 98765 01008"),
        ("Arjun Kapoor", "23CSE009", "Computer Science & Engineering", 6, "A", "+91 98765 01009"),
        ("Riya Jain", "23CSE010", "Computer Science & Engineering", 6, "A", "+91 98765 01010"),
        ("Siddharth Rao", "23CSE011", "Computer Science & Engineering", 6, "B", "+91 98765 01011"),
        ("Neha Choudhury", "23CSE012", "Computer Science & Engineering", 6, "B", "+91 98765 01012"),
        ("Kunal Shah", "23CSE013", "Computer Science & Engineering", 6, "B", "+91 98765 01013"),
        ("Meera Nambiar", "23CSE014", "Computer Science & Engineering", 6, "B", "+91 98765 01014"),
        ("Varun Nair", "23CSE015", "Computer Science & Engineering", 6, "B", "+91 98765 01015"),

        # IT Students (Sem 6, Sec A)
        ("Harsh Vardhan", "23IT001", "Information Technology", 6, "A", "+91 98765 01016"),
        ("Simran Kaur", "23IT002", "Information Technology", 6, "A", "+91 98765 01017"),
        ("Gaurav Mishra", "23IT003", "Information Technology", 6, "A", "+91 98765 01018"),
        ("Tanvi Rao", "23IT004", "Information Technology", 6, "A", "+91 98765 01019"),
        ("Ishaan Iyer", "23IT005", "Information Technology", 6, "A", "+91 98765 01020"),
        ("Divya Agarwal", "23IT006", "Information Technology", 6, "A", "+91 98765 01021"),
        ("Karan Malhotra", "23IT007", "Information Technology", 6, "A", "+91 98765 01022"),
        ("Nisha Pillai", "23IT008", "Information Technology", 6, "A", "+91 98765 01023"),
        ("Alok Pandey", "23IT009", "Information Technology", 6, "A", "+91 98765 01024"),
        ("Pallavi Hegde", "23IT010", "Information Technology", 6, "A", "+91 98765 01025"), # Defaulter (<65%)

        # ECE Students (Sem 6, Sec A)
        ("Naveen Reddy", "23ECE001", "Electronics & Communication", 6, "A", "+91 98765 01026"),
        ("Shreya Saxena", "23ECE002", "Electronics & Communication", 6, "A", "+91 98765 01027"),
        ("Abhishek Das", "23ECE003", "Electronics & Communication", 6, "A", "+91 98765 01028"),
        ("Kavita Menon", "23ECE004", "Electronics & Communication", 6, "A", "+91 98765 01029"),
        ("Prateek Bhatt", "23ECE005", "Electronics & Communication", 6, "A", "+91 98765 01030"),
        ("Swati Joshi", "23ECE006", "Electronics & Communication", 6, "A", "+91 98765 01031"),
        ("Manish Dubey", "23ECE007", "Electronics & Communication", 6, "A", "+91 98765 01032"),
        ("Deepika Sen", "23ECE008", "Electronics & Communication", 6, "A", "+91 98765 01033"),
        ("Rohit Yadav", "23ECE009", "Electronics & Communication", 6, "A", "+91 98765 01034"),
        ("Sonia George", "23ECE010", "Electronics & Communication", 6, "A", "+91 98765 01035"),

        # MECH Students (Sem 6, Sec A)
        ("Vikas Chauhan", "23ME001", "Mechanical Engineering", 6, "A", "+91 98765 01036"),
        ("Tarun Gill", "23ME002", "Mechanical Engineering", 6, "A", "+91 98765 01037"),
        ("Preeti Rathi", "23ME003", "Mechanical Engineering", 6, "A", "+91 98765 01038"),
        ("Karthik Natarajan", "23ME004", "Mechanical Engineering", 6, "A", "+91 98765 01039"),
        ("Pankaj Sharma", "23ME005", "Mechanical Engineering", 6, "A", "+91 98765 01040"),
        ("Anuradha Roy", "23ME006", "Mechanical Engineering", 6, "A", "+91 98765 01041"),
        ("Saurabh Singh", "23ME007", "Mechanical Engineering", 6, "A", "+91 98765 01042"),
        ("Bhavna Sethi", "23ME008", "Mechanical Engineering", 6, "A", "+91 98765 01043"),
        ("Girish Kulkarni", "23ME009", "Mechanical Engineering", 6, "A", "+91 98765 01044"),
        ("Mohit Aggarwal", "23ME010", "Mechanical Engineering", 6, "A", "+91 98765 01045"),
    ]

    all_student_profiles = [default_student_prof]
    for s_name, s_roll, s_branch, s_sem, s_sec, s_phone in indian_students:
        s_user = models.User(
            email=f"{s_roll.lower()}@student.college.edu",
            hashed_password=security.get_password_hash("StudentPass123!"),
            role=models.RoleEnum.student,
            is_active=True
        )
        db.add(s_user)
        db.flush()

        sp = models.StudentProfile(
            user_id=s_user.id,
            full_name=s_name,
            roll_number=s_roll,
            branch=s_branch,
            semester=s_sem,
            section=s_sec,
            phone=s_phone,
            emergency_contact="+91 98765 99999"
        )
        db.add(sp)
        db.flush()
        all_student_profiles.append(sp)

    # --------------------------------------------------------------------------
    # 5. SEED ACADEMIC SESSIONS & REAL ATTENDANCE LOGS
    # --------------------------------------------------------------------------
    print("Generating real lecture sessions and attendance logs...")

    # Group students by branch
    dept_students = {
        "Computer Science & Engineering": [s for s in all_student_profiles if s.branch == "Computer Science & Engineering"],
        "Information Technology": [s for s in all_student_profiles if s.branch == "Information Technology"],
        "Electronics & Communication": [s for s in all_student_profiles if s.branch == "Electronics & Communication"],
        "Mechanical Engineering": [s for s in all_student_profiles if s.branch == "Mechanical Engineering"],
    }

    # Generate 15 distinct dates over past 3 weeks
    base_date = datetime(2026, 8, 17, 10, 0)
    session_id_counter = 1

    for dept_name, s_list in dept_students.items():
        dept_subjects = [sub for sub in subject_objects if sub.branch == dept_name]
        # Find teacher for this dept
        dept_teachers = [t for t in teacher_profile_map.values() if t.department == dept_name]
        lead_teacher = dept_teachers[0] if dept_teachers else list(teacher_profile_map.values())[0]

        for day_offset in range(15):
            current_date = base_date + timedelta(days=day_offset)
            # Skip Sundays
            if current_date.weekday() == 6:
                continue

            sub = dept_subjects[day_offset % len(dept_subjects)]
            assigned_teacher = dept_teachers[day_offset % len(dept_teachers)]

            session = models.AcademicSession(
                id=session_id_counter,
                teacher_id=assigned_teacher.id,
                subject_id=sub.id,
                session_type=models.SessionType.lecture,
                start_time=current_date,
                end_time=current_date + timedelta(hours=1),
                branch=dept_name,
                semester=6,
                section="A",
                conducted_by_name=assigned_teacher.full_name,
                notes=f"Lecture {day_offset + 1}: {sub.name} curriculum delivery"
            )
            db.add(session)
            db.flush()

            # Create attendance logs for students in this department
            for st in s_list:
                # Deterministic presence rate per student:
                # Default student (Aarav Sharma): ~82% attendance
                # Diya Patel: ~95%
                # Rahul Mehra (Defaulter): ~55%
                # Pallavi Hegde (Defaulter): ~50%
                # Others: 78-90%
                if st.roll_number == "23CSE001":  # Aarav Sharma
                    is_present = (day_offset % 5 != 0)  # ~80%
                elif st.roll_number == "23CSE002":  # Diya Patel
                    is_present = True  # ~100%
                elif st.roll_number == "23CSE007":  # Rahul Mehra (Defaulter)
                    is_present = (day_offset % 2 == 0)  # ~50%
                elif st.roll_number == "23IT010":   # Pallavi Hegde (Defaulter)
                    is_present = (day_offset % 3 == 0)  # ~33%
                else:
                    # Realistic ~80-88% attendance
                    seed_val = (hash(st.roll_number) + day_offset) % 10
                    is_present = seed_val > 1

                log = models.AttendanceLog(
                    session_id=session.id,
                    student_id=st.id,
                    timestamp=current_date + timedelta(minutes=random.randint(5, 20)),
                    is_present=is_present,
                    status_tag="PRESENT" if is_present else "ABSENT",
                    remarks=None if is_present else "Did not scan biometrics"
                )
                db.add(log)

            session_id_counter += 1

    # --------------------------------------------------------------------------
    # 6. SEED REAL GRIEVANCES
    # --------------------------------------------------------------------------
    print("Seeding student grievances...")
    grv1 = models.Grievance(
        ticket_id="GRV-CSE-101",
        student_id=default_student_prof.id,
        session_id=1,
        subject_name="Machine Learning & AI",
        reason="Biometric face scanner failed to authenticate due to back-lit glare in Lab 4B. Physically attended the entire lecture.",
        status="Under Review by HOD",
        created_at=datetime(2026, 9, 1, 14, 30)
    )
    db.add(grv1)

    rahul_student = next(s for s in all_student_profiles if s.roll_number == "23CSE007")
    grv2 = models.Grievance(
        ticket_id="GRV-CSE-102",
        student_id=rahul_student.id,
        session_id=2,
        subject_name="Database Management Systems",
        reason="Was representing college in Zonal Football Tournament under official sports quota.",
        status="Granted by HOD",
        created_at=datetime(2026, 8, 28, 11, 0)
    )
    db.add(grv2)

    # --------------------------------------------------------------------------
    # 7. SEED REAL HOLIDAYS & PROXIES
    # --------------------------------------------------------------------------
    print("Seeding institutional academic calendar...")
    h1 = models.Holiday(
        title="Independence Day",
        date="2026-08-15",
        department="all",
        description="National Holiday — Flag Hoisting ceremony at campus grounds",
        created_by="Office of the Registrar"
    )
    h2 = models.Holiday(
        title="Janmashtami",
        date="2026-09-04",
        department="all",
        description="Institutional Gazetted Holiday",
        created_by="Office of the Registrar"
    )
    db.add(h1)
    db.add(h2)

    db.commit()
    print("\n[SUCCESS]: Database seeded with real Indian College data!")
    print(f"  - Total Students: {len(all_student_profiles)}")
    print(f"  - Total Faculty:  {len(faculty_data)}")
    print(f"  - Total Subjects: {len(subjects_data)}")
    print(f"  - Total Sessions: {session_id_counter - 1}")
    db.close()

if __name__ == "__main__":
    seed_database()
