import sqlite3
from datetime import datetime, timedelta
import random

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

# 1. Ensure table schema for grievances exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS grievances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id VARCHAR UNIQUE,
    student_id INTEGER,
    session_id INTEGER,
    subject_name VARCHAR,
    reason VARCHAR,
    status VARCHAR DEFAULT 'Pending HOD Decision',
    created_at DATETIME,
    FOREIGN KEY(student_id) REFERENCES student_profiles(id),
    FOREIGN KEY(session_id) REFERENCES academic_sessions(id)
)
""")
cursor.execute("CREATE INDEX IF NOT EXISTS ix_grievances_ticket_id ON grievances(ticket_id)")

# 2. Ensure subjects exist
subjects = [
    ("CS301", "Machine Learning", "CSE", 6),
    ("CS302", "Database Management Systems", "CSE", 6),
    ("CS303", "Computer Networks", "CSE", 6),
    ("CS304", "Operating Systems", "CSE", 6),
    ("EC301", "Digital Signal Processing", "ECE", 6),
    ("ME301", "Thermodynamics", "MECH", 6),
    ("CE301", "Structural Engineering", "CIVIL", 6)
]

for code, name, branch, sem in subjects:
    cursor.execute("SELECT id FROM subjects WHERE code = ?", (code,))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO subjects (code, name, branch, semester) VALUES (?, ?, ?, ?)", (code, name, branch, sem))

conn.commit()

# 3. Get or create teacher profile
cursor.execute("SELECT id FROM teacher_profiles LIMIT 1")
t_row = cursor.fetchone()
teacher_id = t_row[0] if t_row else 1

# 4. Get all subjects
cursor.execute("SELECT id, code, branch FROM subjects")
all_subj = cursor.fetchall()

# 5. Create academic sessions for the past 14 days
now = datetime.utcnow()
for subj_id, code, branch in all_subj:
    for day_offset in range(1, 8):
        sess_time = now - timedelta(days=day_offset, hours=random.randint(1, 6))
        cursor.execute("SELECT id FROM academic_sessions WHERE subject_id = ? AND date(start_time) = date(?)", (subj_id, sess_time))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO academic_sessions (teacher_id, subject_id, session_type, start_time, end_time, branch, section)
            VALUES (?, ?, 'lecture', ?, ?, ?, 'A')
            """, (teacher_id, subj_id, sess_time, sess_time + timedelta(hours=1), branch))

conn.commit()

# 6. Seed attendance logs for students
cursor.execute("SELECT id, roll_number, branch FROM student_profiles")
students = cursor.fetchall()

cursor.execute("SELECT id, branch FROM academic_sessions")
sessions = cursor.fetchall()

for s_id, roll, branch in students:
    # Match sessions of student branch
    matching_sessions = [sess for sess in sessions if sess[1] == branch or sess[1] == 'CSE']
    for sess_id, b in matching_sessions:
        cursor.execute("SELECT id FROM attendance_logs WHERE session_id = ? AND student_id = ?", (sess_id, s_id))
        if not cursor.fetchone():
            # 85% attendance probability
            is_present = random.random() < 0.82
            cursor.execute("""
            INSERT INTO attendance_logs (session_id, student_id, timestamp, is_present)
            VALUES (?, ?, ?, ?)
            """, (sess_id, s_id, now - timedelta(days=random.randint(0, 7)), is_present))

# 7. Seed initial sample grievance
cursor.execute("SELECT count(*) FROM grievances")
if cursor.fetchone()[0] == 0:
    cursor.execute("""
    INSERT INTO grievances (ticket_id, student_id, session_id, subject_name, reason, status, created_at)
    VALUES ('GRV-901', 1, 1, 'Machine Learning (CS301)', 'Face scanner camera failed to recognize walk-up due to low classroom back-lighting.', 'Pending HOD Decision', ?)
    """, (now - timedelta(days=1),))

conn.commit()
print("REAL ACADEMIC SEEDING COMPLETE: Sessions, subjects, attendance logs, and grievances committed.")
