from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_pool, get_status_counts, get_readings_counts, get_accepted_readings_counts, is_connected, close_pool, get_active_credentials
import os
import traceback
from pydantic import BaseModel

class ConnectionRequest(BaseModel):
    password: str
    dsn: str | None = None
    db_user: str | None = None

app = FastAPI(title="DashboardVSV Backend API")

# Configure CORS based on LOCAL_MODE
local_mode = os.environ.get("LOCAL_MODE", "ON") == "ON"
origins = ["http://localhost:5173", "http://127.0.0.1:5173"] if local_mode else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # allow_credentials cannot be True when origin is '*'
    allow_credentials=local_mode,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Attempt to initialize the pool on server start if DB_PASSWORD is in .env
    init_pool()

@app.get("/api/connection-status")
def connection_status():
    """
    Checks if the database pool is initialized and returns the active connection metadata.
    Returns the actual runtime user/DSN used at pool creation, not the static .env values.
    """
    active_user, active_dsn = get_active_credentials()
    return {
        "connected": is_connected(),
        "user": active_user,
        "dsn":  active_dsn,
        "default_start_date": os.environ.get("DEFAULT_START_DATE", ""),
        "reading_date": os.environ.get("READING_DATE", ""),
    }

@app.post("/api/connect")
def connect_database(request: ConnectionRequest):
    """
    Manual override to initialize the database pool with the provided credentials.
    Optionally accepts dsn and db_user so the user can choose the environment in the UI.
    """
    result = init_pool(
        password=request.password,
        dsn=request.dsn,
        db_user=request.db_user,
    )
    if result is not True:
        dsn_label = request.dsn or "database"
        if result == 'auth_error':
            detail = f"Invalid combination of username and password for '{dsn_label}'."
        else:
            detail = f"Connection to '{dsn_label}' cannot be established."
        raise HTTPException(status_code=401, detail=detail)

    return {"status": "success", "message": "Database connected successfully"}

@app.post("/api/disconnect")
def disconnect_database():
    """
    Closes the Oracle connection pool so the frontend login modal is triggered again.
    """
    close_pool()
    return {"status": "ok", "message": "Disconnected successfully"}

ALLOWED_SUBTYPES = {
    'SmartReadingsNotification',
    'VolumeSeriesNotification',
    'MeterReadingExchange',
}

@app.get("/api/status")
def read_status(
    domain: str,
    subtype: str = 'SmartReadingsNotification',
    start_date: str = '',
):
    """
    Returns the message processing status counts for a specified domain and message subtype.
    start_date: DDMMYYYY string from the UI date picker; falls back to DEFAULT_START_DATE env var.
    """
    from logger import log_message
    try:
        if subtype not in ALLOWED_SUBTYPES:
            raise HTTPException(status_code=400, detail=f"Invalid subtype. Allowed: {', '.join(sorted(ALLOWED_SUBTYPES))}")

        # UI-supplied date wins; fall back to env default
        resolved_start_date = start_date or os.environ.get("DEFAULT_START_DATE", "17012025")

        results, debug_sql = get_status_counts(domain, subtype, resolved_start_date)
        
        domain_suffix = domain.replace('DOM', '')
        transformed_data = {
           f"A{domain_suffix}": 0,
           f"G{domain_suffix}": 0,
           f"V{domain_suffix}": 0,
           f"PG{domain_suffix}": 0,
           f"VM{domain_suffix}": 0,
           f"WV{domain_suffix}": 0,
           f"ON{domain_suffix}": 0
        }
        
        for row in results:
            status = row['IOMSTATUS']
            count = row['AANTAL']
            if status == 'VW': 
                transformed_data[f"VM{domain_suffix}"] = count
            else:
                key = f"{status}{domain_suffix}"
                transformed_data[key] = count
                
        payload = { **transformed_data }
        
        if os.environ.get("DEBUG_MODE", "OFF") == "ON":
            payload["_debug"] = {
                "sql": debug_sql,
                "context": f"Fetching message status counts for {domain}",
                "start_date_used": resolved_start_date,
            }
            
        return payload
        
    except HTTPException:
        raise  # re-raise 400/401 etc. without logging
    except Exception as e:
        tb = traceback.format_exc()
        log_message(f"UNHANDLED EXCEPTION in /api/status (domain={domain}):\n{tb}", category="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/readings")
def read_readings(
    domain: str,
    start_date: str = '',
    reading_date: str = None,
):
    """
    Returns the smart meter readings counts for a specified domain.
    start_date: DDMMYYYY string from the UI start date picker.
    reading_date: Optional DDMMYYYY string for the Accepted Readings filter.
    """
    from logger import log_message
    try:
        # UI-supplied date wins; fall back to env default
        resolved_start_date = start_date or os.environ.get("DEFAULT_START_DATE", "17012025")

        results, debug_sql = get_readings_counts(domain, resolved_start_date)
        
        # New: Get accepted readings count
        accepted_count, accepted_sql = get_accepted_readings_counts(domain, resolved_start_date, reading_date)
        
        domain_suffix = domain.replace('DOM', '')
        transformed_data = {}
        
        for row in results:
            proces_id = row['PROCESID']
            count = row['AANTAL']
            key = f"{proces_id}_{domain_suffix}"
            transformed_data[key] = count
            
        # Add the Accepted row data
        transformed_data[f"ACCEPTED_{domain_suffix}"] = accepted_count
            
        payload = { **transformed_data }
        
        if os.environ.get("DEBUG_MODE", "OFF") == "ON":
            payload["_debug"] = {
                "sql": debug_sql,
                "accepted_sql": accepted_sql,
                "context": f"Fetching readings counts for {domain}",
                "start_date_used": resolved_start_date,
            }
            
        return payload
        
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        log_message(f"UNHANDLED EXCEPTION in /api/readings (domain={domain}):\n{tb}", category="ERROR")
        raise HTTPException(status_code=500, detail=str(e))
