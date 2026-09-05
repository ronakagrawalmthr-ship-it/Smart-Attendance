import requests
import json

BASE_URL = "http://localhost:8000"

def test_final_submission_flow():
    print("Testing /attendance/submit_final/1...")
    
    # Payload simulating teacher submitting after manual edits
    payload = {
        "sessionId": 1,
        "sessionCode": "CS301",
        "present": [
            {"id": 1, "name": "Alex Morgan", "roll": "CS2023045"},
            {"name": "Sarah Jenkins", "roll": "CS2023089"} # roll lookup test
        ],
        "absent": [
            {"id": 3, "name": "David Kumar", "roll": "CS2023102"},
            {"id": 4, "name": "Priya Sharma", "roll": "CS2023014"}
        ]
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer demo_token_teacher"
    }
    
    res = requests.post(f"{BASE_URL}/attendance/submit_final/1", json=payload, headers=headers)
    print("Response Status:", res.status_code)
    print("Response JSON:", res.json())
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("[OK] submit_final successfully processed present and absent students!")

if __name__ == "__main__":
    test_final_submission_flow()
