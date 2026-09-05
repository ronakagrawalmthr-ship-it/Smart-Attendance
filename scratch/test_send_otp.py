import os
import resend
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)
api_key = os.environ.get("RESEND_API_KEY")
resend.api_key = api_key

recipient = "ronakagrawalmthr@gmail.com"
otp = "486771"

print(f"Connecting to Resend API with key: {api_key[:8]}***...")
result = resend.Emails.send({
    "from": "onboarding@resend.dev",
    "to": [recipient],
    "subject": "Password Reset Verification Code - Smart Attendance",
    "html": f"""
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 520px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px auto; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 22px;">Smart Attendance Platform</h2>
            <span style="font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Security & Account Verification</span>
        </div>
        <p style="font-size: 15px; line-height: 1.5; color: #334155;">Hello Ronak,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            We received a request to reset the password for your account associated with <strong>{recipient}</strong>. Use the 6-digit verification code below to establish your new password:
        </p>
        <div style="background-color: #eff6ff; border: 2px dashed #3b82f6; padding: 18px; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; text-align: center; margin: 24px 0;">
            {otp}
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            ⏱ <strong>This code is valid for 15 minutes.</strong> If you did not initiate this request, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Smart Attendance Cloud Infrastructure • Automated System Dispatch
        </p>
    </div>
    """
})

print("Successfully sent to Gmail!")
print("Resend Email ID:", result["id"])
