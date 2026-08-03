import logging
from app.core.config import settings

logger = logging.getLogger("app")


class MailService:
    def send_verification_email(self, email: str, token: str) -> None:
        """
        Mocks rendering templates/verification.html and sending email.
        Logs structured details.
        """
        logger.info(
            "Sending verification email",
            extra={
                "extra_info": {
                    "email": email,
                    "token": token,
                    "template": "verification.html",
                }
            },
        )

    def send_reset_password_email(self, email: str, token: str) -> None:
        """
        Mocks rendering templates/reset_password.html and sending email.
        """
        logger.info(
            "Sending password reset email",
            extra={
                "extra_info": {
                    "email": email,
                    "token": token,
                    "template": "reset_password.html",
                }
            },
        )

    def send_invitation_email(
        self, email: str, token: str, company_name: str
    ) -> None:
        """
        Mocks rendering templates/invitation.html and sending email.
        """
        logger.info(
            "Sending invitation email",
            extra={
                "extra_info": {
                    "email": email,
                    "token": token,
                    "company_name": company_name,
                    "template": "invitation.html",
                }
            },
        )


mail_service = MailService()
