import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Union, Tuple
from pathlib import Path

try:
    from dotenv import load_dotenv
    # Load backend/.env explicitly
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

try:
    import resend
except ImportError:
    resend = None

def send_system_email(
    to_email: Union[str, List[str]],
    subject: str,
    html_content: str,
    sender_name: str = "Smart Attendance System"
) -> Tuple[bool, Optional[str]]:
    """
    Centralized email delivery engine supporting:
    1. Resend API (via RESEND_API_KEY)
    2. SMTP Fallback (e.g. Gmail App Password via SMTP_USER & SMTP_PASSWORD in .env)
    
    Returns (success: bool, error_message: Optional[str]).
    """
    recipients = [to_email] if isinstance(to_email, str) else to_email
    recipients = [e.strip().lower() for e in recipients if e and "@" in e]

    if not recipients:
        return False, "No valid recipient email address provided."

    # 1. Try Resend API
    resend_key = os.environ.get("RESEND_API_KEY")
    if resend and resend_key:
        try:
            resend.api_key = resend_key
            from_sender = f"{sender_name} <onboarding@resend.dev>"
            
            # Resend free tier sends to 1 recipient at a time
            for recipient in recipients:
                resend.Emails.send({
                    "from": from_sender,
                    "to": recipient,
                    "subject": subject,
                    "html": html_content
                })
            print(f"[RESEND SUCCESS] Email dispatched to {recipients} | Subject: {subject}")
            return True, None
        except Exception as e:
            resend_err = str(e)
            print(f"[RESEND NOTICE] Dispatch to {recipients} failed: {resend_err}")
            # Do not return immediately - allow SMTP fallback if configured

    # 2. Try Standard SMTP (e.g., Gmail SMTP with App Password)
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    if smtp_user and smtp_pass:
        try:
            smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
            smtp_port = int(os.environ.get("SMTP_PORT", 465))
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{sender_name} <{smtp_user}>"
            msg["To"] = ", ".join(recipients)
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, recipients, msg.as_string())

            print(f"[SMTP SUCCESS] Email dispatched to {recipients} via {smtp_host}")
            return True, None
        except Exception as e:
            smtp_err = str(e)
            print(f"[SMTP NOTICE] Dispatch to {recipients} failed: {smtp_err}")
            return False, f"SMTP error: {smtp_err}"

    # If Resend failed and no SMTP was configured
    if resend_key:
        return False, "Resend sandbox delivery restricted to verified account owner email."
    
    return False, "No email provider configured (set RESEND_API_KEY or SMTP_USER/SMTP_PASSWORD in .env)."
