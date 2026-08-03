import logging
from app.events.dispatcher import event_bus
from app.mail.service import mail_service

logger = logging.getLogger("app")


def handle_user_registered(data: dict) -> None:
    """
    Handles user registration: sends verification emails and logs audit details.
    """
    email = data.get("email")
    token = data.get("verification_token")
    user_id = data.get("user_id")
    company_id = data.get("company_id")

    # Send verification email via MailService
    mail_service.send_verification_email(email, token)

    # Log audit event
    logger.info(
        "User registration audit log created",
        extra={
            "extra_info": {
                "user_id": str(user_id),
                "company_id": str(company_id),
                "action": "USER_REGISTERED",
            }
        },
    )


def handle_user_logged_in(data: dict) -> None:
    """
    Handles successful user login: logs structured audit details.
    """
    user_id = data.get("user_id")
    email = data.get("email")
    company_id = data.get("company_id")

    # Log audit event
    logger.info(
        "User login audit log created",
        extra={
            "extra_info": {
                "user_id": str(user_id),
                "company_id": str(company_id),
                "email": email,
                "action": "USER_LOGGED_IN",
            }
        },
    )


def handle_user_verified(data: dict) -> None:
    """
    Handles successful email verification: logs structured audit details.
    """
    user_id = data.get("user_id")
    email = data.get("email")

    # Log audit event
    logger.info(
        "User email verified audit log created",
        extra={
            "extra_info": {
                "user_id": str(user_id),
                "email": email,
                "action": "USER_VERIFIED",
            }
        },
    )


def handle_password_reset_requested(data: dict) -> None:
    """
    Handles request to reset password: triggers mock template rendering and sending.
    """
    email = data.get("email")
    token = data.get("token")
    user_id = data.get("user_id")

    # Send email
    mail_service.send_reset_password_email(email, token)

    # Audit log
    logger.info(
        "Password reset request audit log created",
        extra={
            "extra_info": {
                "user_id": str(user_id),
                "email": email,
                "action": "PASSWORD_RESET_REQUESTED",
            }
        },
    )


def handle_password_reset_completed(data: dict) -> None:
    """
    Handles successful password reset: logs audit info.
    """
    user_id = data.get("user_id")
    email = data.get("email")

    # Audit log
    logger.info(
        "Password reset completion audit log created",
        extra={
            "extra_info": {
                "user_id": str(user_id),
                "email": email,
                "action": "PASSWORD_RESET_COMPLETED",
            }
        },
    )


def setup_event_handlers() -> None:
    """
    Subscribes all event handlers to their respective events on the event bus.
    """
    event_bus.subscribe("user_registered", handle_user_registered)
    event_bus.subscribe("UserLoggedIn", handle_user_logged_in)
    event_bus.subscribe("UserVerified", handle_user_verified)
    event_bus.subscribe("PasswordResetRequested", handle_password_reset_requested)
    event_bus.subscribe("PasswordResetCompleted", handle_password_reset_completed)
