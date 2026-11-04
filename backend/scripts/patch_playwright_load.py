from pathlib import Path

p = Path("backend/tests/test_playwright_thousand_audit_5x.py")
text = p.read_text(encoding="utf-8")
text = text.replace('wait_until="networkidle"', 'wait_until="load"')
p.write_text(text, encoding="utf-8")
print("[OK] Replaced networkidle with load in test_playwright_thousand_audit_5x.py")

