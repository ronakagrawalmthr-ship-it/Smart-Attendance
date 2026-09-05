import requests
import re
import json

url = "https://gemini.google.com/share/d633272ea9dc?skid=aeab70a6-f31b-45c1-b90d-4b2233c61ac1"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5"
}

r = requests.get(url, headers=headers)
html = r.text
print("HTTP Status:", r.status_code)
print("HTML Size:", len(html))

# Look for embedded JSON script tags
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
print("Found script tags:", len(scripts))

extracted_text = []
for s in scripts:
    if "WIZ_global_data" in s:
        # Search for conversation text in AF_initDataCallback or similar
        pass
    if "AF_initDataCallback" in s:
        print("Found AF_initDataCallback script!")
        extracted_text.append(s)

import os
out_path = os.path.join(os.path.dirname(__file__), "gemini_share.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Saved HTML to", out_path)

# Let's search for readable text strings longer than 40 chars
pattern = re.compile(r'\"([^\"]{50,})\"')
candidates = pattern.findall(html)
print("Total long string candidates:", len(candidates))

attendance_related = [c for c in candidates if any(k in c.lower() for k in ["attendance", "student", "teacher", "hod", "face", "portal", "camera", "qr"])]
print("Attendance-related candidates found:", len(attendance_related))
dump_path = os.path.join(os.path.dirname(__file__), "gemini_extracted_text.txt")
with open(dump_path, "w", encoding="utf-8") as f:
    for i, item in enumerate(attendance_related):
        f.write(f"\n==================== SECTION {i+1} ====================\n")
        f.write(item + "\n")

print(f"Successfully dumped {len(attendance_related)} sections to {dump_path}")
