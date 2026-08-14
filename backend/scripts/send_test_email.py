import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.mail.service import mail_service


def main():
    recipient = sys.argv[1] if len(sys.argv) > 1 else settings.mail.username
    if not recipient:
        print("Error: Recipient email address not provided.")
        print("Usage: python scripts/send_test_email.py <recipient_email>")
        sys.exit(1)

    print("=== SYNAPSE DEVELOPMENT SMTP EMAIL TEST ===")
    print(f"SMTP Host: {settings.mail.host}")
    print(f"SMTP Port: {settings.mail.port}")
    print(f"SMTP Username: {settings.mail.username}")
    print(f"SMTP Password Configured: {'YES' if bool(settings.mail.password) else 'NO'}")
    print(f"Recipient: {recipient}")
    print("-------------------------------------------")
    print("Attempting outbound SMTP transmission...")

    success = mail_service._send_email(
        recipient=recipient,
        subject="[Synapse Dev] Gmail SMTP Test",
        body_text=f"This is a test outbound email sent from Synapse local development via Gmail SMTP ({settings.mail.host}:{settings.mail.port}).",
        body_html=f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px;">
    <div style="max-width: 500px; background-color: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
        <h2 style="color: #38bdf8;">Synapse Dev SMTP Test</h2>
        <p>Your Gmail SMTP integration is working correctly!</p>
        <p style="font-size: 12px; color: #94a3b8;">Sent via {settings.mail.host}:{settings.mail.port} to {recipient}.</p>
    </div>
</body>
</html>""",
    )

    if success:
        print("SUCCESS: Test email delivered successfully!")
    else:
        print("FAILURE: Email delivery failed or SMTP credentials not configured.")


if __name__ == "__main__":
    main()
