class BaseBusinessException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class UserAlreadyExists(BaseBusinessException):
    def __init__(self, message: str = "User already exists."):
        super().__init__(message, status_code=400)


class CompanyAlreadyExists(BaseBusinessException):
    def __init__(self, message: str = "Company already exists."):
        super().__init__(message, status_code=400)


class InvalidCredentials(BaseBusinessException):
    def __init__(self, message: str = "Invalid credentials."):
        super().__init__(message, status_code=401)


class Unauthorized(BaseBusinessException):
    def __init__(self, message: str = "Unauthorized."):
        super().__init__(message, status_code=401)


class Forbidden(BaseBusinessException):
    def __init__(self, message: str = "Forbidden."):
        super().__init__(message, status_code=403)


class ResourceNotFound(BaseBusinessException):
    def __init__(self, message: str = "Resource not found."):
        super().__init__(message, status_code=404)


class ValidationException(BaseBusinessException):
    def __init__(self, message: str = "Validation failed.", errors: list = None):
        super().__init__(message, status_code=422)
        self.errors = errors or []


class InvitationExpired(BaseBusinessException):
    def __init__(self, message: str = "Invitation has expired."):
        super().__init__(message, status_code=400)


class InvitationAlreadyAccepted(BaseBusinessException):
    def __init__(self, message: str = "Invitation has already been accepted."):
        super().__init__(message, status_code=400)


class UserNotVerified(BaseBusinessException):
    def __init__(self, message: str = "User email not verified."):
        super().__init__(message, status_code=400)


class TokenExpiredException(BaseBusinessException):
    def __init__(self, message: str = "Token has expired."):
        super().__init__(message, status_code=401)


class InvalidTokenException(BaseBusinessException):
    def __init__(self, message: str = "Token is invalid or signature verification failed."):
        super().__init__(message, status_code=401)
