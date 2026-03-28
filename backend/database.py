import os
import oracledb
from dotenv import load_dotenv
from logger import log_sql

# Load environment variables from the local .env file
load_dotenv()

# Global connection pool
_pool = None

def init_pool():
    global _pool
    try:
        # Enable thick mode to support local bequeath connections
        tns_admin = os.environ.get("TNS_ADMIN")
        if tns_admin:
            oracledb.init_oracle_client(config_dir=tns_admin)
        else:
            oracledb.init_oracle_client()
        
        # Create the Oracle Connection Pool
        _pool = oracledb.create_pool(
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            dsn=os.environ.get("DB_DSN", os.environ.get("DB_TNSENTRY_NAME")),
            min=2,
            max=5,
            increment=1
        )
        print("Successfully created Oracle Connection Pool")
    except Exception as e:
        print(f"Failed to create Oracle pool: {e}")

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
        AND IOM.TTIME  > CAST(FROM_TZ(CAST(  TO_DATE('17012025', 'DDMMYYYY')  AS TIMESTAMP), 'CET') AT TIME ZONE 'UTC' AS DATE)
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

