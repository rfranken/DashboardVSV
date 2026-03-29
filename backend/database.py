import os
import oracledb
from dotenv import load_dotenv
from logger import log_sql, log_message

# Load environment variables from the local .env file
load_dotenv(override=True)

# Global connection pool
_pool = None

def is_connected():
    return _pool is not None

def close_pool():
    global _pool
    if _pool:
        try:
            _pool.close(force=True)
            log_message("Oracle connection pool closed (user logout).", category="POOL")
        except Exception as e:
            log_message(f"Error closing pool: {e}", category="ERROR")
        finally:
            _pool = None

def init_pool(password: str = None, dsn: str = None, db_user: str = None):
    global _pool
    # If pool already exists, skip
    if _pool:
        return True
        
    try:
        # Enable thick mode to support local bequeath connections
        tns_admin = os.environ.get("TNS_ADMIN")
        log_message(f"Initializing Oracle client. TNS_ADMIN: {tns_admin or 'Not set'}", category="INIT")
        
        if tns_admin:
            oracledb.init_oracle_client(config_dir=tns_admin)
            log_message("Oracle thick mode initialized with explicit config_dir.", category="INIT")
        else:
            oracledb.init_oracle_client()
            log_message("Oracle thick mode initialized with default settings.", category="INIT")
        
        # Use provided password or fallback to environment (for convenience/legacy)
        db_password = password or os.environ.get("DB_PASSWORD")
        
        if not db_password:
            log_message("No password provided. Pool initialization deferred.", category="AUTH")
            print("No password provided. Pool initialization deferred.")
            return False

        # Resolve DSN and user: UI-selected values take precedence over .env defaults
        resolved_dsn  = dsn     or os.environ.get("DB_DSN", os.environ.get("DB_TNSENTRY_NAME"))
        resolved_user = db_user or os.environ.get("DB_USER")
            
        # Create the Oracle Connection Pool
        log_message(f"Attempting to create connection pool for user: {resolved_user} on DSN: {resolved_dsn}", category="POOL")
        _pool = oracledb.create_pool(
            user=resolved_user,
            password=db_password,
            dsn=resolved_dsn,
            min=2,
            max=5,
            increment=1
        )
        log_message("Successfully created Oracle Connection Pool", category="POOL")
        print("Successfully created Oracle Connection Pool")
        return True
    except Exception as e:
        log_message(f"Failed to create Oracle pool: {str(e)}", category="ERROR")
        print(f"Failed to create Oracle pool: {e}")
        return False

def get_status_counts(domain: str):
    """
    Executes the query to fetch message status counts for a specific domain.
    Utilizes SECURE bind variables (:domain) instead of string concatenation to prevent SQL injection.
    """
    if not _pool:
        raise Exception("Database pool is not initialized")
        
    if not domain.startswith('DOM') or not domain[3:].isdigit():
        raise ValueError("Invalid domain identifier format.")
        
    schema_name = f"{domain}ADMIN"
    raw_start_date = os.environ.get("START_DATE", "17012025")
    # Robustness: Extract only the DDMMYYYY part (first 8 chars) before using in SQL
    start_date = raw_start_date.split(':')[0][:8]
    
    sql = f"""
    SELECT  DECODE(TELLINGEN.STATUS    
                  ,-6,   'A'   --'Afgewezen' 
                  ,-1,   'VW'  --'Verwerking mislukt'
                  , 0,   'WV'  --'Wordt Verwerkt'           
                  , 2 ,  'G'   --'Geaccepteerd'             
                  , 7 ,  'PG'  --'Gedeeltelijk geaccepteerd' 
                  ,      'ON'  --'Onbekend: '||TELLINGEN.STATUS 
                  )               IOMSTATUS
    ,        TELLINGEN.AANTAL     AANTAL                 
    FROM 
        ( 
        SELECT  IOM.LSTATUS               STATUS
        ,      COUNT(*)                  AANTAL
        FROM {schema_name}.G_IO_ARCHIVE_MAIN IOM
        JOIN {schema_name}.G_IO_ARCHIVE_SUBTYPE IOS
               ON IOS.LID = IOM.LSUBTYPEID
        JOIN {schema_name}.G_IO_ARCHIVE_TYPE IOT
                ON IOT.LID = IOM.LTYPEID 
        WHERE (1=1)
        AND IOS.SSUBTYPENAME = 'SmartReadingsNotification'
        AND IOM.TTIME  > CAST(FROM_TZ(CAST(  TO_DATE('{start_date}', 'DDMMYYYY')  AS TIMESTAMP), 'CET') AT TIME ZONE 'UTC' AS DATE)
        GROUP BY IOM.LSTATUS
    ) TELLINGEN
    ORDER BY 1
    """

    context_str = f"Fetching message status counts for {domain}"
    bind_params = {} # No strict dict binds needed here because we used f-strings for the schema validation instead, but passing explicit empty binds.
    
    try:
        with _pool.acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, bind_params)
                
                columns = [col[0] for col in cursor.description]
                cursor.rowfactory = lambda *args: dict(zip(columns, args))
                results = cursor.fetchall()
                
                # Log success
                log_sql(context=context_str, sql=sql, params=bind_params, result="OK")
                
                return results, sql
    except Exception as db_err:
        log_sql(context=context_str, sql=sql, params=bind_params, result="ERROR", error_desc=str(db_err))
        raise db_err

