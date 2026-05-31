import os
import oracledb
from dotenv import load_dotenv
from logger import log_sql, log_message

# Load environment variables from the local .env file.
# override=False means values already present in the environment (e.g. set by
# Start-NetworkMode.ps1 before launching uvicorn) are NOT overwritten by .env.
load_dotenv(override=False)

# Global connection pool
_pool = None
_active_user = None
_active_dsn  = None

# ---------------------------------------------------------------------------
# One-time Oracle thick-mode initialization (module level)
# Oracle only allows this to be called once per process.
# ---------------------------------------------------------------------------
_oracle_client_initialized = False

def _ensure_oracle_client():
    global _oracle_client_initialized
    if _oracle_client_initialized:
        return
    tns_admin = os.environ.get("TNS_ADMIN")
    log_message(f"Initializing Oracle client. TNS_ADMIN: {tns_admin or 'Not set'}", category="INIT")
    try:
        if tns_admin:
            oracledb.init_oracle_client(config_dir=tns_admin)
            log_message("Oracle thick mode initialized with explicit config_dir.", category="INIT")
        else:
            oracledb.init_oracle_client()
            log_message("Oracle thick mode initialized with default settings.", category="INIT")
        _oracle_client_initialized = True
    except Exception as e:
        # If already initialized by a previous call, treat as success
        err = str(e)
        if 'already' in err.lower():
            log_message(f"Oracle client already initialized: {err}", category="INIT")
            _oracle_client_initialized = True
        else:
            log_message(f"Oracle client init failed: {err}", category="ERROR")
            raise

def is_connected():
    return _pool is not None

def get_active_credentials():
    return _active_user, _active_dsn

def close_pool():
    global _pool, _active_user, _active_dsn
    if _pool:
        try:
            _pool.close(force=True)
            log_message("Oracle connection pool closed (user logout).", category="POOL")
        except Exception as e:
            log_message(f"Error closing pool: {e}", category="ERROR")
        finally:
            _pool = None
            _active_user = None
            _active_dsn  = None

def init_pool(password: str = None, dsn: str = None, db_user: str = None):
    global _pool, _active_user, _active_dsn
    # If pool already exists, skip
    if _pool:
        return True
        
    try:
        # Ensure Oracle thick mode is initialized (idempotent)
        _ensure_oracle_client()

        # Use provided password or fallback to environment (for convenience/legacy)
        db_password = password or os.environ.get("DB_PASSWORD")
        
        if not db_password:
            log_message("No password provided. Pool initialization deferred.", category="AUTH")
            print("No password provided. Pool initialization deferred.")
            return 'no_password'

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
        # Persist so /api/connection-status can report the actual runtime values
        _active_user = resolved_user
        _active_dsn  = resolved_dsn
        log_message("Successfully created Oracle Connection Pool", category="POOL")
        print("Successfully created Oracle Connection Pool")
        return True
    except Exception as e:
        err_str = str(e)
        log_message(f"Failed to create Oracle pool: {err_str}", category="ERROR")
        print(f"Failed to create Oracle pool: {e}")
        # ORA-01017: invalid username/password
        if 'ORA-01017' in err_str:
            return 'auth_error'
        # TNS / network errors: ORA-12170 (timeout), ORA-12541 (no listener),
        # ORA-12154 (TNS not resolved), ORA-12545 (connect failed)
        TNS_CODES = ('ORA-12170', 'ORA-12541', 'ORA-12154', 'ORA-12545', 'ORA-12560')
        if any(code in err_str for code in TNS_CODES):
            return 'connection_error'
        return err_str

def get_status_counts(domain: str, subtype: str = 'SmartReadingsNotification', start_date: str = '17012025'):
    """
    Executes the query to fetch message status counts for a specific domain, subtype and start date.
    Utilizes SECURE bind variables (:subtype) instead of string concatenation to prevent SQL injection.
    """
    if not _pool:
        raise Exception("Database pool is not initialized")
        
    if not domain.startswith('DOM') or not domain[3:].isdigit():
        raise ValueError("Invalid domain identifier format.")
        
    schema_name = f"{domain}ADMIN"
    # Robustness: Extract only the DDMMYYYY part (first 8 chars) before using in SQL
    safe_start_date = start_date.split(':')[0][:8]
    
    sql = f"""
    SELECT  DECODE(TELLINGEN.STATUS    
                  ,-6,   'A'   --'Afgewezen' 
                  ,-1,   'VW'  --'Verwerking mislukt'
                  , 0,   'WV'  --'Wordt Verwerkt'           
                  , 2 ,  'G'   --'Geaccepteerd'    
                  , 1,   'V'   --'Verwerkt'         
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
        AND IOS.SSUBTYPENAME = :subtype
        AND IOM.TTIME  >= TO_DATE('{safe_start_date}', 'DDMMYYYY')
        GROUP BY IOM.LSTATUS
    ) TELLINGEN
    ORDER BY 1
    """

    context_str = f"Fetching message status counts for {domain}"
    bind_params = {'subtype': subtype}
    
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

def get_readings_counts(domain: str, start_date: str = '17012025'):
    """
    Executes the query to fetch reading counts for a specific domain and start date.
    """
    if not _pool:
        raise Exception("Database pool is not initialized")
        
    if not domain.startswith('DOM') or not domain[3:].isdigit():
        raise ValueError("Invalid domain identifier format.")
        
    schema_name = f"{domain}ADMIN"
    # Robustness: Extract only the DDMMYYYY part (first 8 chars) before using in SQL
    safe_start_date = start_date.split(':')[0][:8]
    
    sql = f"""
    SELECT GMRE.SCODE      AS PROCESID
    ,      COUNT(*)        AS AANTAL
    FROM   {schema_name}.G_BLOCKING_EVENT EVENT      
    JOIN   {schema_name}.G_MUTATION_REASON_ENUM GMRE
      ON   GMRE.LID = EVENT.LPROCESSID
    WHERE  EVENT.LTYPEID IN ( 23 )
    AND    EVENT.lstate IN ( 1 )
    AND    EVENT.TMODIFIEDAT >= TO_DATE('{safe_start_date}', 'DDMMYYYY')
    GROUP BY GMRE.SCODE
    """

    context_str = f"Fetching readings counts for {domain}"
    bind_params = {}
    
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

def get_parked_readings_counts(domain: str, start_date: str = '17012025'):
    """
    Executes the query to fetch parked reading counts for a specific domain and start date.
    """
    if not _pool:
        raise Exception("Database pool is not initialized")
        
    if not domain.startswith('DOM') or not domain[3:].isdigit():
        raise ValueError("Invalid domain identifier format.")
        
    schema_name = f"{domain}ADMIN"
    # Robustness: Extract only the DDMMYYYY part (first 8 chars) before using in SQL
    safe_start_date = start_date.split(':')[0][:8]
    
    sql = f"""
    SELECT GMRE.SCODE     AS PROCESID
    ,      COUNT(*)       AS AANTAL
    FROM   {schema_name}.G_BLOCKING_EVENT       EVENT 
    JOIN   {schema_name}.G_MUTATION_REASON_ENUM GMRE
      ON   GMRE.LID = EVENT.LPROCESSID
    JOIN   {schema_name}.G_IO_ARCHIVE_MAIN IOM
      ON   IOM.LID   =  EVENT.LIMPORTMESSAGEID 
    JOIN   {schema_name}.G_IO_ARCHIVE_SUBTYPE IOS
      ON   IOS.LID = IOM.LSUBTYPEID
     AND   IOS.SSUBTYPENAME ='SmartReadingsNotification'  
    WHERE  EVENT.LTYPEID NOT IN (1,23) -- GEEN UITVAL
    AND    EVENT.LSTATE  = 1 -- OPEN
    AND    EVENT.TMODIFIEDAT >= TO_DATE('{safe_start_date}', 'DDMMYYYY')
    GROUP BY GMRE.SCODE
    """

    context_str = f"Fetching parked readings counts for {domain}"
    bind_params = {}
    
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

def get_accepted_readings_counts(domain: str, start_date: str = '17012025'):
    """
    Executes the query to fetch accepted reading counts for a specific domain.
    """
    if not _pool:
        raise Exception("Database pool is not initialized")
        
    if not domain.startswith('DOM') or not domain[3:].isdigit():
        raise ValueError("Invalid domain identifier format.")
        
    schema_name = f"{domain}ADMIN"
    
    # User-selected date (START DATETIME)
    safe_start_date = start_date.split(':')[0][:8]
    
    sql = f"""
    SELECT  MUT_REASON.SCODE      AS PROCESSID
    ,       COUNT(STANDEN.DVALUE) AS AANTAL
    FROM {schema_name}.G_METERING_POINT          METERING_POINT
    JOIN {schema_name}.G_MP_DETAILS              DETAILS
      ON DETAILS.LMPID = METERING_POINT.LOBJID
     AND DETAILS.TSTART < sysdate
     AND DETAILS.TSTOP  > sysdate 
    JOIN {schema_name}.G_MP_DETAILS_UDT          DETAILS_UDT
      ON DETAILS_UDT.LOBJID = DETAILS.LID
    JOIN {schema_name}.G_MEASUREMENT             MEASUREMENT
     ON  MEASUREMENT.LMETERINGPOINTID  = METERING_POINT.LOBJID  
    AND  MEASUREMENT.TSTART <= TO_DATE('{safe_start_date}','DDMMYYYY')
    AND  MEASUREMENT.TSTOP  >  TO_DATE('{safe_start_date}','DDMMYYYY')
    AND  MEASUREMENT.LTYPEID IN ( 68 -- Register, nominal for GAS
                                , 3  -- Register, active  for ELK
                                , 7  -- Register, active, production for ELK
                                )
    AND  MEASUREMENT.LDATATYPEID  = 1 -- Measurement
    JOIN {schema_name}.G_TIMESERIES_MAIN TIMESERIES
      ON TIMESERIES.LOBJID = MEASUREMENT.LTSID 
    JOIN {schema_name}.G_ALL_ITS_VALUES_VIEW  STANDEN
      ON STANDEN.LOBJID  = TIMESERIES.LOBJID
    JOIN {schema_name}.G_TSVEL_EVENT SVEL_EVENT
      ON SVEL_EVENT.LTSID  = TIMESERIES.LOBJID 
     AND SVEL_EVENT.TVALTIME  = STANDEN.TTIME
    JOIN {schema_name}.G_MUTATION_REASON_ENUM  MUT_REASON
      ON MUT_REASON.LID  = SVEL_EVENT.LPROCESSID  
    WHERE (1=1)
    -- Alleen deze proces-ids:
    AND MUT_REASON.SCODE IN ('SWITCHPV','SWITCHLV','MOVEIN', 'MOVEOUT', 'ALLMTCHG', 'MONTHMTR', 'PERMTR', 'EOSUPPLY')
    -- Alleen als de Originator de eigen RNB is:
    AND ( 
        -- Alleen als de Originator de eigen RNB is:
        SVEL_EVENT.SORIGINATOR = DETAILS_UDT.SGRIDOPERATOR
        OR
        -- Of indien het bericht naar de DSO is gestuurd, de Aansluiting DGO onderdeel is van die DSO:
        DETAILS_UDT.SGRIDOPERATOR IN (
                                      SELECT PTY_DGO.SCODE  
                                      FROM   {schema_name}.G_PARTY            PTY_DSO
                                      JOIN   {schema_name}.G_PARTY_PARTY_LINK PPL
                                        ON   PPL.LSRCPARTYID  = PTY_DSO.LOBJID 
                                      JOIN   {schema_name}.G_PARTY            PTY_DGO  
                                        ON   PTY_DGO.LOBJID   = PPL.LDESTPARTYID 
                                      WHERE  PTY_DSO.SCODE = SVEL_EVENT.SORIGINATOR -- SVEL-EVENT
                                     )
        )
    AND STANDEN.TMODIFIED > TO_DATE('{safe_start_date}','DDMMYYYY')
    GROUP BY MUT_REASON.SCODE 
    ORDER BY 1,2
    """

    context_str = f"Fetching accepted readings counts for {domain}"
    bind_params = {}
    
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

def get_message_details(domain: str, status_prefix: str, subtype: str = 'SmartReadingsNotification', start_date: str = '17012025'):
    """
    Executes the query to fetch individual message details (bestandsnaam, aanmaakdatum)
    for a specific domain, message status and start date.
    """
    if not _pool:
        raise Exception("Database pool is not initialized")
        
    if not domain.startswith('DOM') or not domain[3:].isdigit():
        raise ValueError("Invalid domain identifier format.")
        
    schema_name = f"{domain}ADMIN"
    safe_start_date = start_date.split(':')[0][:8]
    
    # Map UI status prefix to DB status value
    status_map = {
        'A': ' = -6',
        'VM': ' = -1',
        'VW': ' = -1',
        'WV': ' = 0',
        'G': ' = 2',
        'V': ' = 1',
        'PG': ' = 7',
        'ON': ' NOT IN (-6, -1, 0, 1, 2, 7)'
    }
    
    status_cond = status_map.get(status_prefix, ' = -999')
    
    sql = f"""
    SELECT IOM.LID                                                                            AS ID
         , IOM.SFILENAME                                                                      AS BESTANDSNAAM
         , CAST(FROM_TZ(CAST(IOM.TCREATED AS TIMESTAMP), 'UTC') AT TIME ZONE 'CET' AS DATE)   AS AANMAAKDATUM
         , COUNT(DISTINCT MP.SCODE)                                                           AS AANTAL_AANSLUITINGEN
    FROM {schema_name}.G_IO_ARCHIVE_MAIN IOM
    JOIN {schema_name}.G_IO_ARCHIVE_SUBTYPE IOS
      ON IOS.LID = IOM.LSUBTYPEID
    LEFT JOIN {schema_name}.g_io_archive_tslink IOLINK
      ON IOLINK.LARCHIVEID = IOM.LID
    LEFT JOIN {schema_name}.G_TIMESERIES_MAIN TMS
      ON TMS.LOBJID = IOLINK.LTSID
    LEFT JOIN {schema_name}.G_MEASUREMENT MEASUREMENT
      ON MEASUREMENT.LTSID = TMS.LOBJID
    LEFT JOIN {schema_name}.G_METERING_POINT MP
      ON MP.LOBJID = MEASUREMENT.LMETERINGPOINTID
    WHERE (1 = 1)
    AND IOS.SSUBTYPENAME = :subtype
    AND IOM.TTIME >= TO_DATE('{safe_start_date}', 'DDMMYYYY')
    AND IOM.LSTATUS {status_cond}
    GROUP BY IOM.LID
    ,        IOM.SFILENAME
    ,        IOM.TCREATED
    ORDER BY IOM.TCREATED DESC
    """
    
    context_str = f"Fetching message details for {domain} status {status_prefix}"
    bind_params = {'subtype': subtype}
    
    try:
        with _pool.acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, bind_params)
                
                columns = [col[0] for col in cursor.description]
                cursor.rowfactory = lambda *args: dict(zip(columns, args))
                results = cursor.fetchall()
                
                log_sql(context=context_str, sql=sql, params=bind_params, result="OK")
                
                return results, sql
    except Exception as db_err:
        log_sql(context=context_str, sql=sql, params=bind_params, result="ERROR", error_desc=str(db_err))
        raise db_err

def get_accepted_readings_details(domain: str, process_id: str, start_date: str = '17012025'):
    """
    Executes the query to fetch accepted reading details for a specific domain and process ID.
    """
    if not _pool:
        raise Exception("Database pool is not initialized")
        
    if not domain.startswith('DOM') or not domain[3:].isdigit():
        raise ValueError("Invalid domain identifier format.")
        
    schema_name = f"{domain}ADMIN"
    safe_start_date = start_date.split(':')[0][:8]
    
    sql = f"""
    WITH INLV_STANDEN AS 
    (
         SELECT TTIME,
         LOBJID,
         DVALUE,
         LSTATUS,
         1 LVALUETYPE,
         TMODIFIED,
         SMODIFIER
         FROM   {schema_name}.G_TIMESERIES_DATA_1
    )
    SELECT  METERING_POINT.SCODE            AS MP_EAN_CODE
    ,       MEASUREMENT.SCODE               AS TELWERK
    ,       STANDEN.DVALUE                  AS STAND
    ,       CAST(FROM_TZ(CAST(STANDEN.TTIME AS TIMESTAMP), 'UTC') AT TIME ZONE 'CET' AS DATE)  AS OPNAMEDATUM
    ,       SVEL_EVENT.SDOSSIERID           AS TRANSACTIEDOSSIER
    ,       MUT_REASON.SCODE                AS PROCESID
    ,       CASE to_char(STANDEN.LSTATUS)
                   when '126' then 'Berekend'
                   when '150' then 'Gemeten'
                   else            '*ONGELDIG:'||STANDEN.LSTATUS
             END                                AS HERKOMST      
    ,       CAST(FROM_TZ(CAST(STANDEN.TMODIFIED AS TIMESTAMP), 'UTC') AT TIME ZONE 'CET' AS DATE)          AS ONTVANGEN_OP
    FROM {schema_name}.G_METERING_POINT          METERING_POINT
    JOIN {schema_name}.G_MP_DETAILS              DETAILS
      ON DETAILS.LMPID = METERING_POINT.LOBJID
     AND DETAILS.TSTART < TO_DATE('{safe_start_date}','DDMMYYYY')
     AND DETAILS.TSTOP  > TO_DATE('{safe_start_date}','DDMMYYYY')
    JOIN {schema_name}.G_MP_DETAILS_UDT          DETAILS_UDT
      ON DETAILS_UDT.LOBJID = DETAILS.LID
    JOIN {schema_name}.G_MEASUREMENT             MEASUREMENT
     ON  MEASUREMENT.LMETERINGPOINTID  = METERING_POINT.LOBJID  
    AND  MEASUREMENT.TSTART <= TO_DATE('{safe_start_date}','DDMMYYYY')
    AND  MEASUREMENT.TSTOP  >  TO_DATE('{safe_start_date}','DDMMYYYY')
    AND  MEASUREMENT.LTYPEID IN ( 68 -- Register, nominal for GAS
                                , 3  -- Register, active  for ELK
                                , 7  -- Register, active, production for ELK
                                )
    AND  MEASUREMENT.LDATATYPEID  = 1 -- Measurement
    JOIN {schema_name}.G_TIMESERIES_MAIN TIMESERIES
      ON TIMESERIES.LOBJID = MEASUREMENT.LTSID 
    JOIN INLV_STANDEN  STANDEN
      ON STANDEN.LOBJID  = TIMESERIES.LOBJID
    JOIN {schema_name}.G_TSVEL_EVENT SVEL_EVENT
      ON SVEL_EVENT.LTSID  = TIMESERIES.LOBJID 
     AND SVEL_EVENT.TVALTIME  = STANDEN.TTIME
    JOIN {schema_name}.G_MUTATION_REASON_ENUM  MUT_REASON
      ON MUT_REASON.LID  = SVEL_EVENT.LPROCESSID  
    WHERE (1=1)
    -- Alleen deze proces-id:
    AND MUT_REASON.SCODE = :process_id
    -- Alleen als de Originator de eigen RNB is:
    AND SVEL_EVENT.SORIGINATOR = DETAILS_UDT.SGRIDOPERATOR
    AND STANDEN.TMODIFIED > TO_DATE('{safe_start_date}','DDMMYYYY')
    """
    
    context_str = f"Fetching accepted readings details for {domain} and process {process_id}"
    bind_params = {'process_id': process_id}
    
    try:
        with _pool.acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, bind_params)
                
                columns = [col[0] for col in cursor.description]
                cursor.rowfactory = lambda *args: dict(zip(columns, args))
                results = cursor.fetchall()
                
                log_sql(context=context_str, sql=sql, params=bind_params, result="OK")
                
                return results, sql
    except Exception as db_err:
        log_sql(context=context_str, sql=sql, params=bind_params, result="ERROR", error_desc=str(db_err))
        raise db_err



