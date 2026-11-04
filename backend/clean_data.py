import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
import models

def clean_database(mode="clean_students"):
    """
    mode='clean_students': Wipes operational logs and student profiles.
                           Retains Admin, HOD, Faculty, and Curriculum subjects.
    mode='factory_reset':  Wipes all tables completely except 1 fresh Master Admin.
    """
    if mode == "factory_reset" and sys.stdin.isatty():
        confirm = input("Are you sure you want to run factory_reset? This will delete all faculty, timetables, and subjects. Type 'YES' to confirm: ")
        if confirm != "YES":
            print("[ABORTED] Factory reset cancelled by user.")
            return

    db = next(database.get_db())
    try:
        print(f"[*] Starting Database Clean in mode: {mode}...")

        # 1. Clear operational logs first (foreign keys)
        deleted_att = db.query(models.AttendanceLog).delete()
        print(f" -> Deleted {deleted_att} attendance logs.")

        deleted_sess = db.query(models.AcademicSession).delete()
        print(f" -> Deleted {deleted_sess} academic sessions.")

        deleted_grv = db.query(models.Grievance).delete()
        print(f" -> Deleted {deleted_grv} grievance tickets.")

        deleted_notif = db.query(models.ParentNotificationLog).delete()
        print(f" -> Deleted {deleted_notif} parent notification logs.")

        deleted_audit = db.query(models.AuditLog).delete()
        print(f" -> Deleted {deleted_audit} audit logs.")

        # 2. Clear student records
        deleted_st = db.query(models.StudentProfile).delete()
        print(f" -> Deleted {deleted_st} student profiles.")

        # Delete student users
        deleted_stu_users = db.query(models.User).filter(models.RoleEnum.student == models.User.role).delete()
        print(f" -> Deleted {deleted_stu_users} student login accounts.")

        if mode == "factory_reset":
            db.query(models.TeacherProfile).delete()
            db.query(models.TimetableSlot).delete()
            db.query(models.Subject).delete()
            db.query(models.ProxyAssignment).delete()
            db.query(models.Holiday).delete()
            # Delete non-admin users
            db.query(models.User).filter(models.User.role != models.RoleEnum.admin).delete()
            print(" -> Deleted all faculty, timetables, and subjects (Factory Reset).")

        db.commit()
        print("\n[SUCCESS] Fake data wiped clean! Database is fresh and ready for real college data.")

        # Print remaining counts without leaking raw PII emails to stdout
        print("\n--- Remaining Database Status ---")
        user_count = db.query(models.User).count()
        print(f"Users: {user_count} total institutional accounts active")
        print("Students:", db.query(models.StudentProfile).count())
        print("Sessions:", db.query(models.AcademicSession).count())
        print("Attendance Logs:", db.query(models.AttendanceLog).count())

    except Exception as e:
        db.rollback()
        print("[ERROR] Cleaning failed:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "clean_students"
    clean_database(mode)
