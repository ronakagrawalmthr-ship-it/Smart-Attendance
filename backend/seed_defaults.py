import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Ensure backend root is in python path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import models
import database
import security
from routers.timetable import seed_sample_timetable_for_class

def seed_database_defaults():
    db = next(database.get_db())
    try:
        # 1. System Settings & Day-0 Initialization
        admin_exists = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).first() is not None
        env_setup = os.getenv("SETUP_COMPLETED")
        if env_setup is not None:
            is_completed = env_setup.strip().lower()
        else:
            is_completed = "true" if admin_exists else "false"

        settings_map = {
            "is_setup_completed": is_completed,
            "institution_name": "Apex Institute of Technology & Engineering",
            "admin_name": "Director of Academic Affairs",
            "admin_email": "admin@college.edu"
        }
        for key, val in settings_map.items():
            row = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
            if not row:
                db.add(models.SystemSetting(key=key, value=val))
        db.commit()

        # 2. Master Admin Account
        admin_pwd = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@Secure2026!")
        admin = db.query(models.User).filter(models.User.email == "admin@college.edu").first()
        if not admin:
            admin = models.User(
                email="admin@college.edu",
                hashed_password=security.get_password_hash(admin_pwd),
                role=models.RoleEnum.admin,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(" [SEED] Master Admin created: admin@college.edu")

        # 3. HOD (Head of Department) Account
        hod_pwd = os.getenv("DEFAULT_HOD_PASSWORD", "Hod@Secure2026!")
        hod = db.query(models.User).filter(models.User.email == "hod.cse@college.edu").first()
        if not hod:
            hod = models.User(
                email="hod.cse@college.edu",
                hashed_password=security.get_password_hash(hod_pwd),
                role=models.RoleEnum.hod,
                is_active=True
            )
            db.add(hod)
            db.commit()
            db.refresh(hod)
            print(" [SEED] HOD Account created: hod.cse@college.edu")

        # Link HOD TeacherProfile
        hod_prof = db.query(models.TeacherProfile).filter(models.TeacherProfile.user_id == hod.id).first()
        if not hod_prof:
            hod_prof = models.TeacherProfile(
                user_id=hod.id,
                full_name="Dr. Rajesh Mehta",
                department="Computer Science & Engineering",
                phone_number="+91 98345 67890"
            )
            db.add(hod_prof)
            db.commit()
            print(" [SEED] HOD Teacher Profile linked: Dr. Rajesh Mehta (CSE)")
        else:
            hod_prof.full_name = "Dr. Rajesh Mehta"
            hod_prof.phone_number = "+91 98345 67890"
            hod_prof.department = "Computer Science & Engineering"
            db.commit()

        # 4. Faculty / Teacher Account
        fac_pwd = os.getenv("DEFAULT_TEACHER_PASSWORD", "Faculty@Secure2026!")
        faculty = db.query(models.User).filter(models.User.email == "faculty@college.edu").first()
        if not faculty:
            faculty = models.User(
                email="faculty@college.edu",
                hashed_password=security.get_password_hash(fac_pwd),
                role=models.RoleEnum.teacher,
                is_active=True
            )
            db.add(faculty)
            db.commit()
            db.refresh(faculty)
            print(" [SEED] Faculty Account created: faculty@college.edu")

        # Link TeacherProfile
        teacher_prof = db.query(models.TeacherProfile).filter(models.TeacherProfile.user_id == faculty.id).first()
        if not teacher_prof:
            teacher_prof = models.TeacherProfile(
                user_id=faculty.id,
                full_name="Dr. Vikram Sharma",
                department="Computer Science & Engineering",
                phone_number="+91 98234 56789"
            )
            db.add(teacher_prof)
            db.commit()
            print(" [SEED] Teacher Profile linked: Dr. Vikram Sharma (CSE)")
        else:
            teacher_prof.full_name = "Dr. Vikram Sharma"
            teacher_prof.phone_number = "+91 98234 56789"
            teacher_prof.department = "Computer Science & Engineering"
            db.commit()

        # 5. Primary Demo Student Account
        student_pwd = os.getenv("DEFAULT_STUDENT_PASSWORD", "Student@Secure2026!")
        student1 = db.query(models.User).filter(models.User.email == "student1@college.edu").first()
        if not student1:
            student1 = models.User(
                email="student1@college.edu",
                hashed_password=security.get_password_hash(student_pwd),
                role=models.RoleEnum.student,
                is_active=True
            )
            db.add(student1)
            db.commit()
            db.refresh(student1)

        sp1 = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == "CS2023001").first()
        if not sp1:
            sp1 = models.StudentProfile(
                user_id=student1.id,
                full_name="Aditya Verma",
                roll_number="CS2023001",
                branch="Computer Science & Engineering",
                semester=3,
                section="C",
                phone="+91 94123 45678",
                emergency_contact="+91 94123 45679",
                parent_email="parents.aditya@college.edu"
            )
            db.add(sp1)
            db.commit()
            print(" [SEED] Student Profile (Aditya Verma) initialized")
        else:
            if not sp1.user_id:
                sp1.user_id = student1.id
            db.commit()

        # 6. Secondary Student: Aarav Sharma (CS2023002)
        student2 = db.query(models.User).filter(models.User.email == "aarav.sharma@college.edu").first()
        if not student2:
            student2 = models.User(
                email="aarav.sharma@college.edu",
                hashed_password=security.get_password_hash(student_pwd),
                role=models.RoleEnum.student,
                is_active=True
            )
            db.add(student2)
            db.commit()
            db.refresh(student2)

        sp2 = db.query(models.StudentProfile).filter(models.StudentProfile.roll_number == "CS2023002").first()
        if not sp2:
            sp2 = models.StudentProfile(
                user_id=student2.id,
                full_name="Aarav Sharma",
                roll_number="CS2023002",
                branch="Computer Science & Engineering",
                semester=3,
                section="C",
                phone="+91 98123 45670",
                emergency_contact="+91 98123 45671",
                parent_email="guardian.sharma@gmail.com"
            )
            db.add(sp2)
            db.commit()
            print(" [SEED] Student Profile (Aarav Sharma) initialized")
        else:
            sp2.phone = sp2.phone or "+91 98123 45670"
            sp2.parent_email = sp2.parent_email or "guardian.sharma@gmail.com"
            db.commit()

        # 7. Seed Curriculum Subjects
        curriculum = [
            ("CS301", "Data Structures & Algorithms", "Computer Science & Engineering", 3),
            ("CS302", "Database Management Systems", "Computer Science & Engineering", 3),
            ("CS303", "Computer Organization & Architecture", "Computer Science & Engineering", 3),
            ("CS304", "Discrete Mathematical Structures", "Computer Science & Engineering", 3),
            ("CS305", "Object-Oriented Programming with Java", "Computer Science & Engineering", 3),
        ]
        for code, name, branch, sem in curriculum:
            sub = db.query(models.Subject).filter(models.Subject.code == code).first()
            if not sub:
                db.add(models.Subject(code=code, name=name, branch=branch, semester=sem))
        db.commit()
        print(" [SEED] Curriculum Subjects verified")

        # 8. Seed Timetable for Computer Science & Engineering Sem 3 Section C
        slots_count = db.query(models.TimetableSlot).filter(
            models.TimetableSlot.branch == "Computer Science & Engineering",
            models.TimetableSlot.semester == 3,
            models.TimetableSlot.section == "C"
        ).count()
        if slots_count == 0:
            seed_sample_timetable_for_class("Computer Science & Engineering", 3, "C", db)
            print(" [SEED] Timetable slots seeded for CSE Sem 3 Section C")

        # 9. Seed Official 2026 Academic Holidays
        holidays_2026 = [
            ("Republic Day", "2026-01-26", "National Holiday - Constitution of India Commemoration"),
            ("Holi Festival", "2026-03-04", "Institutional Holiday - Festival of Colors"),
            ("Eid-ul-Fitr", "2026-03-21", "Gazetted Academic Holiday"),
            ("Dr. B.R. Ambedkar Jayanti", "2026-04-14", "National Holiday commemorating Dr. B.R. Ambedkar"),
            ("Maharashtra Day / Labour Day", "2026-05-01", "Institutional Non-Instructional Day"),
            ("Independence Day", "2026-08-15", "National Celebration & University Flag Hoisting"),
            ("Raksha Bandhan", "2026-08-27", "Institutional Cultural Holiday"),
            ("Janmashtami", "2026-09-04", "Academic Holiday"),
            ("Mahatma Gandhi Jayanti", "2026-10-02", "National Non-Instructional Holiday"),
            ("Dussehra (Vijayadashami)", "2026-10-20", "Festival Recess"),
            ("Diwali (Deepavali Break)", "2026-10-24", "Festival of Lights - Academic Recess (No Classes)"),
            ("Govardhan Puja", "2026-10-25", "Diwali Extended Recess"),
            ("Bhai Dooj", "2026-10-26", "Festival Recess"),
            ("Guru Nanak Jayanti", "2026-11-04", "Gazetted Institutional Holiday"),
            ("Christmas Day", "2026-12-25", "Gazetted Academic Holiday"),
            ("Winter Recess Begins", "2026-12-28", "Semester End Winter Break"),
            ("New Year's Eve Recess", "2026-12-31", "Winter Break")
        ]
        for title, dt, desc in holidays_2026:
            exists = db.query(models.Holiday).filter(models.Holiday.date == dt).first()
            if not exists:
                db.add(models.Holiday(
                    title=title,
                    date=dt,
                    department="all",
                    description=desc,
                    created_by="Registrar Office"
                ))
        db.commit()
        print(" [SEED] Official 2026 Academic Holidays verified")

        # 10. Seed Realistic Sample Academic Sessions & Attendance Records if empty
        existing_logs = db.query(models.AttendanceLog).count()
        if existing_logs < 10 and sp1 and sp2:
            sub_dsa = db.query(models.Subject).filter(models.Subject.code == "CS301").first()
            sub_dbms = db.query(models.Subject).filter(models.Subject.code == "CS302").first()
            sub_coa = db.query(models.Subject).filter(models.Subject.code == "CS303").first()
            
            # Create past lecture sessions across last 2 weeks
            session_dates = [
                datetime(2026, 10, 12, 9, 0),
                datetime(2026, 10, 13, 10, 0),
                datetime(2026, 10, 14, 11, 0),
                datetime(2026, 10, 15, 9, 0),
                datetime(2026, 10, 16, 10, 0),
                datetime(2026, 10, 19, 9, 0),
                datetime(2026, 10, 21, 10, 0),
                datetime(2026, 10, 22, 11, 0),
            ]
            
            subjects_cycle = [sub_dsa, sub_dbms, sub_coa, sub_dsa, sub_dbms, sub_coa, sub_dsa, sub_dbms]
            
            for i, dt in enumerate(session_dates):
                subj = subjects_cycle[i % len(subjects_cycle)]
                sess = models.AcademicSession(
                    teacher_id=teacher_prof.id if teacher_prof else None,
                    subject_id=subj.id if subj else None,
                    session_type=models.SessionType.lecture,
                    start_time=dt,
                    end_time=dt + timedelta(hours=1),
                    branch="Computer Science & Engineering",
                    semester=3,
                    section="C",
                    conducted_by_name="Dr. Vikram Sharma"
                )
                db.add(sess)
                db.commit()
                db.refresh(sess)

                # Ronak Agrawal: Attends 7 out of 8 (87.5% - Safe Standing)
                r_present = (i != 4) # Absent on Oct 16
                log1 = models.AttendanceLog(
                    session_id=sess.id,
                    student_id=sp1.id,
                    timestamp=dt + timedelta(minutes=5),
                    is_present=r_present,
                    status_tag="PRESENT" if r_present else "ABSENT",
                    confidence_score=98.8 if r_present else None
                )
                db.add(log1)

                # Aarav Sharma: Attends 5 out of 8 (62.5% - Defaulter Risk)
                a_present = (i in [0, 1, 3, 5, 7])
                log2 = models.AttendanceLog(
                    session_id=sess.id,
                    student_id=sp2.id,
                    timestamp=dt + timedelta(minutes=7),
                    is_present=a_present,
                    status_tag="PRESENT" if a_present else "ABSENT",
                    confidence_score=97.5 if a_present else None
                )
                db.add(log2)

            db.commit()
            print(" [SEED] Realistic Academic Sessions & Verified Turnouts Seeded (Ronak: 87.5%, Aarav: 62.5%)")

        print(" [SUCCESS] System defaults seeding complete.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database_defaults()
