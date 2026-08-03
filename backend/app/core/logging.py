import json
import logging
import sys


class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Safely extract extra_info if passed in the log record
        extra_info = getattr(record, "extra_info", None)
        if extra_info is not None:
            log_data["extra_info"] = extra_info

        def json_serial(obj):
            import uuid
            from datetime import datetime
            if isinstance(obj, uuid.UUID):
                return str(obj)
            if isinstance(obj, datetime):
                return obj.isoformat()
            return str(obj)

        return json.dumps(log_data, default=json_serial)


def setup_logging() -> None:
    """
    Sets up the structured JSON logger.
    Configures the root-level log handlers for the 'app' module.
    """
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)

    # Prevent duplicating handlers if initialized multiple times
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = StructuredFormatter(datefmt="%Y-%m-%dT%H:%M:%S%z")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
