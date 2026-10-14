import urllib.request
import json

def test_login(ident, pwd):
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login', 
        data=json.dumps({'email': ident, 'password': pwd}).encode(), 
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read())
            u = data.get("user", {})
            print(f"[SUCCESS] {ident} -> Name: {u.get('full_name')} | Roll: {u.get('roll_number')} | Email: {u.get('email')} | Role: {u.get('role')}")
    except Exception as e:
        print(f"[FAILED] {ident} -> {e}")

test_login('2500650100111', '2500650100111')
test_login('23CSE001', '23CSE001')
test_login('23cse001', '23cse001')
test_login('2500650100888', '2500650100888')
