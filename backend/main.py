from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_pool, get_status_counts, is_connected, close_pool
import os
from pydantic import BaseModel

class ConnectionRequest(BaseModel):
    password: str
    dsn: str | None = None
    db_user: str | None = None

app = FastAPI(title="DashboardVSV Backend API")

# Configure CORS to allow our Vite React frontend to request data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
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
    Checks if the database pool is initialized and returns connection metadata.
    """
    return {
        "connected": is_connected(),
        "user": os.environ.get("DB_USER"),
        "dsn": os.environ.get("DB_DSN", os.environ.get("DB_TNSENTRY_NAME"))
    }

@app.post("/api/connect")
def connect_database(request: ConnectionRequest):
    """
    Manual override to initialize the database pool with the provided credentials.
    Optionally accepts dsn and db_user so the user can choose the environment in the UI.
    """
    success = init_pool(
        password=request.password,
        dsn=request.dsn,
        db_user=request.db_user,
    )
    if not success:
        raise HTTPException(status_code=401, detail="Authentication failed or database refused connection.")
    return {"status": "success", "message": "Database connected successfully"}

@app.post("/api/disconnect")
def disconnect_database():
    """
    Closes the Oracle connection pool so the frontend login modal is triggered again.
    """
    close_pool()
    return {"status": "ok", "message": "Disconnected successfully"}

@app.get("/api/status")
def read_status(domain: str):
    """
    Returns the message processing status counts for a specified domain.
    Expected domain format: DOMx (e.g., DOM5, DOM16)
    """
    try:
        results, debug_sql = get_status_counts(domain)
        
        # Transform the result list of dicts into the flat dictionary format expected by the frontend
        
        domain_suffix = domain.replace('DOM', '')
        transformed_data = {
           f"A{domain_suffix}": 0,
           f"G{domain_suffix}": 0,
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
                
        # Send back payload + optional debugging 
        payload = { **transformed_data, "start_date": os.environ.get("START_DATE", "17012025") }
        
        if os.environ.get("DEBUG_MODE", "OFF") == "ON":
            payload["_debug"] = {
                "sql": debug_sql,
                "context": f"Fetching message status counts for {domain}"
            }
            
        return payload
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
