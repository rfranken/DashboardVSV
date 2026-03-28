import os
from datetime import datetime

LOG_FILE = "backend.log"

def log_sql(context: str, sql: str, params: dict, result: str, error_desc: str = None):
    """
    Writes the SQL execution state to backend.log precisely per the requirements.
    DEBUG_MODE: ON
    - Context: A description of why the SQL was executed
    - SQL: The SQL exactly in the way it was handed down (with binds)
    - Result: 'OK' or 'ERROR'
    - Error description: Database error details.
    """
    
    if os.environ.get("DEBUG_MODE", "OFF") != "ON":
        return

    # Basic formatting to file
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"--- [ {datetime.now().isoformat()} ] ---\n")
        f.write(f"Context: {context}\n")
        f.write(f"SQL: {sql.strip()}\n")
        f.write(f"Binds: {params}\n")
        f.write(f"Result: {result}\n")
        if error_desc:
            f.write(f"Error description: {error_desc}\n")
        f.write("\n")
