import re
from pathlib import Path

app_js_path = Path("mobile-app/App.js")
content = app_js_path.read_text(encoding="utf-8")

# 1. Update CURRENT_LAN_IP to active IP 10.193.242.38
content = content.replace("const CURRENT_LAN_IP = '10.173.212.38';", "const CURRENT_LAN_IP = '10.193.242.38';")

# 2. Remove Quick Demo Login Pill for faculty@college.edu
demo_pill_pattern = re.compile(
    r'\{\/\* Quick Demo Login Pill \*\/\}[\s\S]*?<\/View>\s*<\/View>',
    re.MULTILINE
)
# Let's inspect exact target block
old_demo_pill = """                {/* Quick Demo Login Pill */}
                <View style={styles.demoPillContainer}>
                  <View>
                    <Text style={styles.demoPillLabel}>Verified Faculty Login</Text>
                    <Text style={styles.demoPillValue}>faculty@college.edu</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.demoFillBtn} 
                    onPress={() => {
                      setAuthEmail('faculty@college.edu');
                      setAuthPassword('faculty123');
                    }}
                  >
                    <Text style={styles.demoFillBtnText}>Auto-fill</Text>
                  </TouchableOpacity>
                </View>"""

if old_demo_pill in content:
    content = content.replace(old_demo_pill, "{/* Production Mode: Demo login pills removed */}")
    print("[OK] Removed Faculty Demo Pill")
else:
    # Try normalized CRLF
    old_demo_pill_crlf = old_demo_pill.replace("\n", "\r\n")
    if old_demo_pill_crlf in content:
        content = content.replace(old_demo_pill_crlf, "{/* Production Mode: Demo login pills removed */}")
        print("[OK] Removed Faculty Demo Pill (CRLF)")
    else:
        print("[NOTE] Demo pill not found or already removed")

# 3. Remove dev_otp auto-fill and auto-generated code pill
old_otp_fill = """      if (data.dev_otp) {
        setForgotDevOtp(data.dev_otp);
        setForgotOtp(data.dev_otp);
      }"""
new_otp_fill = """      // Production Mode: OTP dispatched strictly to real email. Auto-fill disabled."""

if old_otp_fill in content:
    content = content.replace(old_otp_fill, new_otp_fill)
    print("[OK] Disabled dev_otp auto-fill")
else:
    old_otp_fill_crlf = old_otp_fill.replace("\n", "\r\n")
    if old_otp_fill_crlf in content:
        content = content.replace(old_otp_fill_crlf, new_otp_fill)
        print("[OK] Disabled dev_otp auto-fill (CRLF)")

old_dev_otp_pill = """                  {forgotDevOtp && (
                    <View style={[styles.demoPillContainer, { marginBottom: 14 }]}>
                      <Text style={styles.demoPillLabel}>Auto-Generated Code:</Text>
                      <Text style={[styles.demoPillValue, { color: '#38bdf8', fontWeight: 'bold' }]}>{forgotDevOtp}</Text>
                    </View>
                  )}"""

if old_dev_otp_pill in content:
    content = content.replace(old_dev_otp_pill, "{/* Production: User enters OTP from real email */}")
    print("[OK] Removed dev_otp display pill")
else:
    old_dev_otp_pill_crlf = old_dev_otp_pill.replace("\n", "\r\n")
    if old_dev_otp_pill_crlf in content:
        content = content.replace(old_dev_otp_pill_crlf, "{/* Production: User enters OTP from real email */}")
        print("[OK] Removed dev_otp display pill (CRLF)")

# 4. Remove fake hardcoded 10:00 AM lectures fallback
old_fake_lectures = """      } else if (subjectsList.length > 0) {
        const activeSubjects = subjectsList.slice(0, 5);
        const timeSlots = ['10:00 AM - 11:00 AM', '11:30 AM - 12:30 PM', '02:00 PM - 03:00 PM', '03:30 PM - 04:30 PM'];
        const rooms = ['Room A - Lab 2', 'Room A - Lab 1', 'Room A - Lab 4', 'Room B - Seminar Hall'];
        
        const dynamicLectures = activeSubjects.map((sub, idx) => ({
          id: sub.id,
          code: sub.code,
          name: sub.name,
          semester: `Semester ${sub.semester || targetSem}`,
          section: `Section ${targetSec}`,
          room: rooms[idx % rooms.length],
          time: timeSlots[idx % timeSlots.length],
          status: idx === 0 ? 'Live Now' : idx === 1 ? 'Upcoming' : 'Scheduled',
          enrolled: liveRoster.length,
          roster: liveRoster,
          teacher_name: teacher?.name || 'Faculty Member'
        }));
        setLectures(dynamicLectures);
        console.log(`[Roster Sync] Configured ${dynamicLectures.length} dynamic courses with ${liveRoster.length} enrolled students.`);
      } else {"""

new_real_lectures = """      } else {
        // Production Mode: Do not fabricate fake time slots. Real schedule only.
        setLectures([]);"""

if old_fake_lectures in content:
    content = content.replace(old_fake_lectures, new_real_lectures)
    print("[OK] Removed fake hardcoded fallback lectures")
else:
    old_fake_lectures_crlf = old_fake_lectures.replace("\n", "\r\n")
    if old_fake_lectures_crlf in content:
        content = content.replace(old_fake_lectures_crlf, new_real_lectures)
        print("[OK] Removed fake hardcoded fallback lectures (CRLF)")

app_js_path.write_text(content, encoding="utf-8")
print("[ALL APP.JS AUDIT FIXES APPLIED SUCCESSFULLY]")

