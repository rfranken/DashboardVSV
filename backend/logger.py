import os
import logging
from datetime import datetime, timedelta
from logging.handlers import TimedRotatingFileHandler

LOG_FILE = os.path.join(os.path.dirname(__file__), "backend.log")

# ---------------------------------------------------------------------------
# Custom handler: rotates daily at midnight, archives as backend_DDMMYYYY.log
# ---------------------------------------------------------------------------
class _DailyRotatingHandler(TimedRotatingFileHandler):
    """
    TimedRotatingFileHandler that names rotated files as:
        backend_DDMMYYYY.log   (the date of the day that just ended)
    instead of the default 'backend.log.YYYY-MM-DD' suffix.
    """
    def rotation_filename(self, default_name: str) -> str:
        # default_name is "<base>.<YYYY-MM-DD-HH-MM-SS>" — we only need the date
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%d%m%Y")
        base = os.path.splitext(LOG_FILE)[0]   # strips .log
        return f"{base}_{yesterday}.log"


def _build_logger() -> logging.Logger:
    """Constructs and returns the singleton application logger."""
    logger = logging.getLogger("dashboard_backend")
    if logger.handlers:          # already configured (module reload guard)
        return logger

    logger.setLevel(logging.DEBUG)

    # Rotate every day at midnight; keep 30 days of archives
    handler = _DailyRotatingHandler(
        filename=LOG_FILE,
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8",
        delay=False,
        utc=False,               # use local time for midnight rollover
    )
    handler.suffix = "%d%m%Y"   # kept for reference; actual naming via rotation_filename
    handler.setLevel(logging.DEBUG)

    # Plain text formatter — preserves existing log style
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger


# Module-level singleton
_logger = _build_logger()


# ---------------------------------------------------------------------------
# Rename existing backend.log → backend_DDMMYYYY.log on startup
# so the fresh log file is always today's.
# ---------------------------------------------------------------------------
def _archive_existing_log() -> None:
    """
    If backend.log already exists when the backend starts, rename it to
    yesterday's dated archive so the active log file always starts clean.
    Per user requirement: rename even if it contains today's entries.
    """
    if not os.path.exists(LOG_FILE):
        return
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%d%m%Y")
    base = os.path.splitext(LOG_FILE)[0]
    archive_path = f"{base}_{yesterday}.log"
    try:
        os.rename(LOG_FILE, archive_path)
    except OSError:
        pass  # already renamed or locked — silently continue

_archive_existing_log()


# ---------------------------------------------------------------------------
# Public API  (interface unchanged from original logger.py)
# ---------------------------------------------------------------------------
def log_sql(context: str, sql: str, params: dict, result: str, error_desc: str = None) -> None:
    """
    Logs an SQL execution record to backend.log.
    Only active when DEBUG_MODE=ON in the environment.
    """
    if os.environ.get("DEBUG_MODE", "OFF") != "ON":
        return

    lines = [
        f"--- [ {datetime.now().isoformat()} ] ---",
        "Type: SQL_EXECUTION",
        f"Context: {context}",
        f"SQL: {sql.strip()}",
        f"Binds: {params}",
        f"Result: {result}",
    ]
    if error_desc:
        lines.append(f"Error description: {error_desc}")
    lines.append("")
    _logger.debug("\n".join(lines))


def log_message(message: str, category: str = "INFO") -> None:
    """
    Logs a general diagnostic message to backend.log.
    ERROR category always writes; other categories require DEBUG_MODE=ON.
    """
    if category != "ERROR" and os.environ.get("DEBUG_MODE", "OFF") != "ON":
        return

    lines = [
        f"--- [ {datetime.now().isoformat()} ] ---",
        "Type: DIAGNOSTIC",
        f"Category: {category}",
        f"Message: {message}",
        "",
    ]
    _logger.debug("\n".join(lines))
