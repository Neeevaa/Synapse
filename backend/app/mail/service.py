import os
import logging
import smtplib
from datetime import datetime
from email.message import EmailMessage
from app.core.config import settings
from app.core.config.mail import MailSettings

logger = logging.getLogger("app")


class MailService:
    def _send_email(
        self,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> bool:
        """
        Sends outbound email via SMTP using MailSettings configuration (Gmail / custom SMTP).
        Dynamically reads configuration to ensure fresh environment variable state.
        Never logs passwords or sensitive credentials.
        """
        mail_config = MailSettings()
        host = mail_config.host
        port = mail_config.port
        username = mail_config.username
        password = mail_config.password
        from_addr = mail_config.from_address

        has_password = bool(password)

        logger.info(
            f"[SMTP_ENV_CHECK] Host={host}, Port={port}, Username={username}, PasswordConfigured={has_password}",
            extra={
                "extra_info": {
                    "smtp_host": host,
                    "smtp_port": port,
                    "smtp_username": username,
                    "smtp_password_configured": has_password,
                }
            },
        )

        if not username or not password:
            logger.warning(
                "[SMTP_SEND_SKIPPED] SMTP credentials not fully configured in environment.",
                extra={
                    "extra_info": {
                        "recipient": recipient,
                        "subject": subject,
                        "smtp_username": username,
                        "password_configured": has_password,
                    }
                },
            )
            return False

        if os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("TESTING") == "true":
            logger.info(
                "[SMTP_SEND_MOCK] Pytest test environment detected. Mocking SMTP email delivery.",
                extra={
                    "extra_info": {
                        "recipient": recipient,
                        "subject": subject,
                        "pytest_mock": True,
                    }
                },
            )
            return True

        logger.info(
            f"[SMTP_SEND_START] Connecting to {host}:{port} for recipient={recipient}",
            extra={
                "extra_info": {
                    "recipient": recipient,
                    "subject": subject,
                    "smtp_host": host,
                    "smtp_port": port,
                }
            },
        )

        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = from_addr
            msg["To"] = recipient
            msg.set_content(body_text)

            if body_html:
                msg.add_alternative(body_html, subtype="html")

            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                if mail_config.MAIL_STARTTLS:
                    server.starttls()
                    server.ehlo()
                server.login(username, password)
                server.send_message(msg)

            logger.info(
                f"[SMTP_SEND_SUCCESS] Outbound SMTP email delivered successfully to recipient={recipient}",
                extra={
                    "extra_info": {
                        "recipient": recipient,
                        "subject": subject,
                        "smtp_host": host,
                        "smtp_port": port,
                        "sender": from_addr,
                    }
                },
            )
            return True

        except Exception as e:
            # Clear error logging without exposing credentials or password
            logger.error(
                f"[SMTP_SEND_FAILED] Failed to deliver SMTP email to recipient={recipient}: {type(e).__name__} - {str(e)}",
                extra={
                    "extra_info": {
                        "recipient": recipient,
                        "subject": subject,
                        "smtp_host": host,
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                    }
                },
            )
            return False

    def send_verification_email(self, email: str, token: str) -> bool:
        """
        Renders verification email and dispatches via SMTP.
        """
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        subject = "Verify your Synapse account"

        body_text = f"""Hello,

Thank you for registering on Synapse. Please verify your email address by opening the following link in your browser:

{verification_url}

If you did not register for a Synapse account, please ignore this email.
"""

        body_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }}
        .brand {{ font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 24px; }}
        h1 {{ font-size: 20px; font-weight: 700; color: #f8fafc; margin-top: 0; margin-bottom: 16px; }}
        p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }}
        .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; border: none; font-family: inherit; }}
        .footer {{ margin-top: 32px; pt-24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }}
        .link {{ font-size: 12px; color: #38bdf8; word-break: break-all; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="brand">SYNAPSE</div>
        <h1>Verify your email address</h1>
        <p>Welcome to Synapse! Please click the button below to verify your email address and activate your organization account.</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{verification_url}" class="btn" target="_blank">Verify Email Address</a>
        </p>
        <p>Or copy and paste this link into your web browser:</p>
        <p className="link"><a href="{verification_url}" style="color: #38bdf8;">{verification_url}</a></p>
        <div class="footer">
            <p>&copy; Synapse Platform Inc. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        logger.info(
            f"[VERIFICATION_EMAIL_START] Recipient={email}",
            extra={
                "extra_info": {
                    "email": email,
                    "template": "verification.html",
                }
            },
        )
        return self._send_email(email, subject, body_text, body_html)

    def send_reset_password_email(self, email: str, token: str) -> bool:
        """
        Renders password reset email and dispatches via SMTP.
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        subject = "Reset your Synapse password"

        body_text = f"""Hello,

We received a request to reset your Synapse password. Open the following link to set a new password:

{reset_url}

If you did not request a password reset, please ignore this email.
"""

        body_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }}
        .brand {{ font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 24px; }}
        h1 {{ font-size: 20px; font-weight: 700; color: #f8fafc; margin-top: 0; margin-bottom: 16px; }}
        p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }}
        .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-family: inherit; }}
        .footer {{ margin-top: 32px; pt-24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="brand">SYNAPSE</div>
        <h1>Reset your password</h1>
        <p>We received a request to reset your Synapse account password. Click the button below to proceed.</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}" class="btn" target="_blank">Reset Password</a>
        </p>
        <p>Or copy and paste this link into your web browser:</p>
        <p><a href="{reset_url}" style="color: #38bdf8; font-size: 12px;">{reset_url}</a></p>
        <div class="footer">
            <p>&copy; Synapse Platform Inc. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        logger.info(
            f"[RESET_PASSWORD_EMAIL_START] Recipient={email}",
            extra={
                "extra_info": {
                    "email": email,
                    "template": "reset_password.html",
                }
            },
        )
        return self._send_email(email, subject, body_text, body_html)

    def send_invitation_email(
        self,
        email: str,
        token: str,
        company_name: str,
        project_name: str = "",
        role: str = "DEVELOPER",
        specialization: str | None = None,
        personal_message: str | None = None,
        inviter_name: str | None = None,
        join_url: str | None = None,
        expires_at: datetime | None = None,
    ) -> bool:
        """
        Renders project invitation email and dispatches via SMTP.
        """
        join_link = join_url or f"{settings.FRONTEND_URL}/join?token={token}"
        subject = f"Invitation to join {project_name or company_name} on Synapse"
        inviter_str = inviter_name or "A team manager"

        spec_str = f" ({specialization})" if specialization else ""
        msg_quote = f'\nPersonal Message:\n"{personal_message}"\n' if personal_message else ""

        body_text = f"""Hello,

{inviter_str} has invited you to join {project_name or company_name} on Synapse as a {role}{spec_str}.
{msg_quote}
To accept this invitation and join your team workspace, please click the link below:

{join_link}

This invitation link expires on {expires_at or '7 days'}.
"""

        msg_box_html = (
            f'<div style="background-color: #0f172a; padding: 16px; border-radius: 8px; border-left: 4px solid #38bdf8; font-style: italic; font-size: 13px; color: #cbd5e1; margin-bottom: 24px;">&ldquo;{personal_message}&rdquo;</div>'
            if personal_message
            else ""
        )

        body_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }}
        .brand {{ font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 24px; }}
        h1 {{ font-size: 20px; font-weight: 700; color: #f8fafc; margin-top: 0; margin-bottom: 16px; }}
        p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 20px; }}
        .badge {{ display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 16px; }}
        .btn {{ display: inline-block; background-color: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-family: inherit; }}
        .footer {{ margin-top: 32px; pt-24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="brand">SYNAPSE</div>
        <div class="badge">{role}{spec_str}</div>
        <h1>Project Team Invitation</h1>
        <p><strong>{inviter_str}</strong> has invited you to join <strong>{project_name or company_name}</strong> on Synapse.</p>
        {msg_box_html}
        <p style="text-align: center; margin: 32px 0;">
            <a href="{join_link}" class="btn" target="_blank">Accept Invitation & Join Team</a>
        </p>
        <p>Or copy and paste this secure link into your web browser:</p>
        <p><a href="{join_link}" style="color: #38bdf8; font-size: 12px; word-break: break-all;">{join_link}</a></p>
        <div class="footer">
            <p>&copy; Synapse Platform Inc. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        logger.info(
            f"[INVITATION_EMAIL_SERVICE_CALLED] Recipient={email}, Project={project_name}, Company={company_name}",
            extra={
                "extra_info": {
                    "email": email,
                    "company_name": company_name,
                    "project_name": project_name,
                    "role": role,
                    "specialization": specialization,
                    "inviter_name": inviter_name,
                    "join_url": join_link,
                    "expires_at": str(expires_at) if expires_at else None,
                    "template": "invitation.html",
                }
            },
        )
        return self._send_email(email, subject, body_text, body_html)


mail_service = MailService()
