from pathlib import Path

p = Path("backend/tests/test_playwright_thousand_audit_5x.py")
text = p.read_text(encoding="utf-8")

# Persona 2: HOD Portal uses spideronak@gmail.com / jarvis@1234
text = text.replace('email_input.first.fill("hod.cse@college.edu")', 'email_input.first.fill("spideronak@gmail.com")')
text = text.replace('pwd_input.first.fill("hod123")', 'pwd_input.first.fill("jarvis@1234")')

# Persona 5: Student Grievances uses ronakagrawalmthr@gmail.com / 2500650100111
text = text.replace('id_input.first.fill("aarav.sharma@college.edu")', 'id_input.first.fill("ronakagrawalmthr@gmail.com")')
text = text.replace('pwd_input.first.fill("2500650100112")', 'pwd_input.first.fill("2500650100111")')

p.write_text(text, encoding="utf-8")
print("[OK] Updated Persona 2 and Persona 5 to use real accounts")

