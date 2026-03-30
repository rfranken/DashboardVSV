# DashboardVSV — Automated Test Specification

> **Purpose**: This document defines all test cases for the DashboardVSV application in a format  
> that an AI model can execute autonomously (using Playwright for UI tests and `httpx`/`requests`  
> for backend API tests).  
>
> **Stack**: React 19 / Vite (frontend on `http://localhost:5173`), FastAPI (backend on `http://localhost:8000`)  
> **Test runner**: Playwright (Python) for E2E · `pytest` + `httpx`/`requests` for API tests  

---

## 0. Prerequisites & Setup

### 0.1 Environment Requirements

| Item | Expected value |
|------|---------------|
| Frontend URL | `http://localhost:5173` |
| Backend URL  | `http://localhost:8000` |
| Backend running | `uvicorn main:app` in `./backend/` |
| Frontend running | `npm run dev` in project root |
| Oracle DB | **NOT required** for API contract tests (mock mode) |

### 0.2 How to Start the Application Under Test

```powershell
# Start everything
cd c:\development\AntiGravity\Dashboard
npm run start:all
# OR manually:
# Terminal 1 – backend
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Terminal 2 – frontend
npm run dev
```

### 0.3 Python Test Dependencies

```bash
pip install pytest httpx playwright pytest-playwright
python -m playwright install chromium
```

### 0.4 Playwright Configuration Stub

```python
# conftest.py (place in Tests/)
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
API_BASE  = "http://localhost:8000"
```

---

## 1. Backend API Tests (No DB Required — Mock/Contract Level)

> All tests below send real HTTP requests to the running FastAPI backend.  
> Where a live Oracle connection is absent, tests assert the correct error shape.

---

### TC-API-001 · GET /api/connection-status — Backend is reachable and returns correct schema

**File**: `tests/test_api_connection.py`  
**Trigger**: Backend running, no DB connected

```
GIVEN the FastAPI backend is running on port 8000
WHEN  GET http://localhost:8000/api/connection-status
THEN  HTTP status == 200
AND   response body is JSON
AND   response JSON contains key "connected" (bool)
AND   response JSON contains key "user" (str or null)
AND   response JSON contains key "dsn"  (str or null)
AND   response JSON contains key "default_start_date" (str)
```

**Automation script**:
```python
import httpx

def test_connection_status_schema():
    r = httpx.get("http://localhost:8000/api/connection-status")
    assert r.status_code == 200
    body = r.json()
    assert "connected" in body
    assert "user" in body
    assert "dsn" in body
    assert "default_start_date" in body
    assert isinstance(body["connected"], bool)
```

---

### TC-API-002 · POST /api/connect — Wrong password returns 401

**File**: `tests/test_api_connection.py`  
**Trigger**: Backend running, Oracle reachable but password deliberately wrong

```
GIVEN the FastAPI backend is running
WHEN  POST http://localhost:8000/api/connect
      body: { "password": "WRONG_PASSWORD", "dsn": "DSFATN2", "db_user": "FATN2_GEN_FRANKEN" }
THEN  HTTP status == 401
AND   response JSON contains key "detail"
AND   detail message mentions "Authentication failed" or "database refused connection"
```

**Automation script**:
```python
def test_connect_wrong_password():
    r = httpx.post(
        "http://localhost:8000/api/connect",
        json={"password": "WRONG_PASSWORD", "dsn": "DSFATN2", "db_user": "FATN2_GEN_FRANKEN"},
    )
    assert r.status_code == 401
    body = r.json()
    assert "detail" in body
```

---

### TC-API-003 · POST /api/connect — Empty password returns 401 or 422

```
GIVEN the FastAPI backend is running
WHEN  POST http://localhost:8000/api/connect  body: { "password": "" }
THEN  HTTP status is 401 OR 422
AND   the application does NOT crash (no HTTP 500)
```

**Automation script**:
```python
def test_connect_empty_password():
    r = httpx.post("http://localhost:8000/api/connect", json={"password": ""})
    assert r.status_code in (401, 422)
```

---

### TC-API-004 · POST /api/connect — Missing `password` field returns 422

```
GIVEN the FastAPI backend is running
WHEN  POST http://localhost:8000/api/connect  body: {}
THEN  HTTP status == 422  (Pydantic validation error)
AND   response JSON contains "detail" list with field error
```

**Automation script**:
```python
def test_connect_missing_password_field():
    r = httpx.post("http://localhost:8000/api/connect", json={})
    assert r.status_code == 422
    body = r.json()
    assert "detail" in body
```

---

### TC-API-005 · GET /api/status — Invalid subtype returns 400

```
GIVEN the FastAPI backend is running
WHEN  GET http://localhost:8000/api/status?domain=DOM3&subtype=INVALID_TYPE
THEN  HTTP status == 400
AND   response JSON detail mentions "Invalid subtype"
AND   detail lists the three allowed values
```

**Automation script**:
```python
def test_status_invalid_subtype():
    r = httpx.get("http://localhost:8000/api/status", params={"domain": "DOM3", "subtype": "INVALID_TYPE"})
    assert r.status_code == 400
    body = r.json()
    assert "Invalid subtype" in body["detail"]
```

---

### TC-API-006 · GET /api/status — Missing domain returns 422

```
GIVEN the FastAPI backend is running
WHEN  GET http://localhost:8000/api/status?subtype=SmartReadingsNotification  (no domain param)
THEN  HTTP status == 422
```

**Automation script**:
```python
def test_status_missing_domain():
    r = httpx.get("http://localhost:8000/api/status", params={"subtype": "SmartReadingsNotification"})
    assert r.status_code == 422
```

---

### TC-API-007 · POST /api/disconnect — Always returns 200 with success status

```
GIVEN the FastAPI backend is running (connection state does not matter)
WHEN  POST http://localhost:8000/api/disconnect
THEN  HTTP status == 200
AND   response JSON == { "status": "ok", "message": "Disconnected successfully" }
```

**Automation script**:
```python
def test_disconnect_always_succeeds():
    r = httpx.post("http://localhost:8000/api/disconnect")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
```

---

### TC-API-008 · POST /api/disconnect — After disconnect, connection-status reports not connected

```
GIVEN the FastAPI backend is running
WHEN  POST http://localhost:8000/api/disconnect
AND   then GET http://localhost:8000/api/connection-status
THEN  second response body "connected" == false
```

**Automation script**:
```python
def test_disconnect_clears_connection():
    httpx.post("http://localhost:8000/api/disconnect")
    r = httpx.get("http://localhost:8000/api/connection-status")
    body = r.json()
    assert body["connected"] is False
```

---

### TC-API-009 · GET /api/status — No DB pool → returns 500 with detail (not a crash)

```
GIVEN the backend is running AND the DB pool has been explicitly disconnected
WHEN  GET http://localhost:8000/api/status?domain=DOM3&subtype=SmartReadingsNotification
THEN  HTTP status == 500
AND   response JSON contains "detail"
AND   no unhandled exception / traceback is exposed at the HTTP layer
```

**Automation script**:
```python
def test_status_without_connection():
    httpx.post("http://localhost:8000/api/disconnect")   # ensure disconnected
    r = httpx.get("http://localhost:8000/api/status", params={"domain": "DOM3"})
    assert r.status_code == 500
    assert "detail" in r.json()
```

---

### TC-API-010 · CORS — localhost origin is accepted

```
GIVEN LOCAL_MODE=ON (default)
WHEN  OPTIONS http://localhost:8000/api/connection-status
      Origin: http://localhost:5173
THEN  response header Access-Control-Allow-Origin contains "http://localhost:5173"
```

**Automation script**:
```python
def test_cors_localhost_allowed():
    r = httpx.options(
        "http://localhost:8000/api/connection-status",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    acao = r.headers.get("access-control-allow-origin", "")
    assert "localhost:5173" in acao or acao == "*"
```

---

## 2. Frontend UI Tests (Playwright — No Real DB Required)

> These tests drive the browser. The backend must be running. A **real** Oracle connection is  
> **NOT** required — the tests validate UI state before and after connection attempts.

---

### TC-UI-001 · Page loads and shows ConnectModal on first visit

```
GIVEN the frontend is running on http://localhost:5173
WHEN  the user navigates to http://localhost:5173
THEN  the page title contains "DashboardVSV" or the <h1> reads "DashboardVSV"
AND   the ConnectModal overlay is visible (modal backdrop present)
AND   the modal header reads "Database Authentication"
AND   the Environment dropdown (#env-select) is visible
AND   the Database User field is visible and read-only
AND   the Password input (type=password) is visible and focused
AND   the "Initialize Connection" button is visible and enabled
```

**Automation script**:
```python
from playwright.sync_api import sync_playwright

def test_connect_modal_on_load():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("text=Database Authentication")
        
        assert page.is_visible("text=Database Authentication")
        assert page.is_visible("#env-select")
        assert page.is_visible("input[type='password']")
        assert page.is_visible("button:has-text('Initialize Connection')")
        
        browser.close()
```

---

### TC-UI-002 · ConnectModal — Default environment is DSFATN2 and db user auto-fills

```
GIVEN the ConnectModal is open
WHEN  no user interaction has occurred
THEN  the Environment dropdown (#env-select) value is "DSFATN2"
AND   the Database User field text is "FATN2_GEN_FRANKEN"
```

**Automation script**:
```python
def test_default_env_and_db_user():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("#env-select")
        
        assert page.input_value("#env-select") == "DSFATN2"
        db_user_text = page.locator("p:has-text('FATN2_GEN_FRANKEN')").inner_text()
        assert "FATN2_GEN_FRANKEN" in db_user_text
        
        browser.close()
```

---

### TC-UI-003 · ConnectModal — Changing environment updates Database User automatically

```
GIVEN the ConnectModal is open
WHEN  the user selects "DSACT2" from the Environment dropdown
THEN  the Database User field updates to "ACT2_GEN_FRANKENR"

WHEN  the user selects "DSPRD" from the Environment dropdown
THEN  the Database User field updates to "PRD_FRANKENR"
```

**Automation script**:
```python
def test_env_change_updates_db_user():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("#env-select")
        
        page.select_option("#env-select", "DSACT2")
        page.wait_for_timeout(300)
        assert "ACT2_GEN_FRANKENR" in page.content()
        
        page.select_option("#env-select", "DSPRD")
        page.wait_for_timeout(300)
        assert "PRD_FRANKENR" in page.content()
        
        browser.close()
```

---

### TC-UI-004 · ConnectModal — submitting with wrong password shows error message

```
GIVEN the ConnectModal is open
WHEN  the user types "WRONG_PASSWORD" in the password field
AND   clicks "Initialize Connection"
THEN  a red error panel appears inside the modal
AND   the error text is visible (not empty)
AND   the modal does NOT close
AND   the main dashboard is NOT visible
```

**Automation script**:
```python
def test_wrong_password_shows_error():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("input[type='password']")
        
        page.fill("input[type='password']", "WRONG_PASSWORD")
        page.click("button:has-text('Initialize Connection')")
        
        # Wait for error (loading spinner disappears and error appears)
        page.wait_for_selector(".text-red-600", timeout=10000)
        assert page.is_visible(".text-red-600")
        # Modal still open
        assert page.is_visible("text=Database Authentication")
        
        browser.close()
```

---

### TC-UI-005 · ConnectModal — submit button shows "Connecting to Oracle..." spinner while loading

```
GIVEN the ConnectModal is open
WHEN  the user fills the password and clicks "Initialize Connection"
THEN  during the API call the button text changes to "Connecting to Oracle..."
AND   a spinner icon (animate-spin) is visible on the button
AND   the button is disabled during loading
```

**Automation script**:
```python
def test_loading_spinner_during_submit():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # Intercept the /api/connect call to add artificial latency
        page.route("**/api/connect", lambda route: (page.wait_for_timeout(2000), route.continue_())[-1])
        
        page.goto("http://localhost:5173")
        page.fill("input[type='password']", "any_password")
        page.click("button:has-text('Initialize Connection')")
        
        assert page.is_visible("text=Connecting to Oracle...")
        assert page.is_disabled("button:has-text('Connecting to Oracle...')")
        
        browser.close()
```

---

### TC-UI-006 · Header — Refresh button is disabled before connection

```
GIVEN the page has loaded and the ConnectModal is visible (user not yet connected)
WHEN  the dashboard header is inspected
THEN  the Refresh button (text "Refresh") has the attribute disabled
AND   the Refresh button has class "cursor-not-allowed" or "bg-gray-400"
```

**Automation script**:
```python
def test_refresh_disabled_before_connect():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("button:has-text('Refresh')")
        
        refresh_btn = page.locator("button:has-text('Refresh')")
        assert refresh_btn.is_disabled()
        
        browser.close()
```

---

### TC-UI-007 · Header — Message Subtype dropdown contains exactly 3 valid options

```
GIVEN the page has loaded
WHEN  the Message Subtype select (#subtype-select) is inspected
THEN  it contains exactly 3 options:
      - "SmartReadingsNotification"
      - "VolumeSeriesNotification"
      - "MeterReadingExchange"
AND   the default selected value is "SmartReadingsNotification"
```

**Automation script**:
```python
def test_message_subtype_dropdown():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("#subtype-select")
        
        options = page.locator("#subtype-select option").all_inner_texts()
        assert len(options) == 3
        assert "SmartReadingsNotification" in options
        assert "VolumeSeriesNotification" in options
        assert "MeterReadingExchange" in options
        assert page.input_value("#subtype-select") == "SmartReadingsNotification"
        
        browser.close()
```

---

### TC-UI-008 · Header — Date picker (#start-date-picker) is present and max is today

```
GIVEN the page has loaded
WHEN  the date picker (#start-date-picker) is inspected
THEN  the element exists with type="date"
AND   the "max" attribute equals today's date in YYYY-MM-DD format
```

**Automation script**:
```python
from datetime import date

def test_date_picker_max_is_today():
    today = date.today().isoformat()   # YYYY-MM-DD
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("#start-date-picker")
        
        max_attr = page.get_attribute("#start-date-picker", "max")
        assert max_attr == today
        
        browser.close()
```

---

### TC-UI-009 · Header — "Connected as" and "Database" labels are visible

```
GIVEN the page has loaded (any connection state)
WHEN  the header area is inspected
THEN  a span containing "Connected as:" is visible
AND   a span containing "Database:" is visible
```

**Automation script**:
```python
def test_header_connection_labels():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("text=Connected as:")
        
        assert page.is_visible("text=Connected as:")
        assert page.is_visible("text=Database:")
        
        browser.close()
```

---

### TC-UI-010 · Header — "Log Out" button is NOT visible before login

```
GIVEN the ConnectModal is open (user not connected)
WHEN  the header is inspected
THEN  the "Log Out" button is NOT visible / not rendered in the DOM
```

**Automation script**:
```python
def test_logout_hidden_before_connect():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("text=Database Authentication")
        
        logout_count = page.locator("button:has-text('Log Out')").count()
        assert logout_count == 0
        
        browser.close()
```

---

### TC-UI-011 · DashboardTable — Table renders with exactly 7 status rows + header row

```
GIVEN the page has loaded (connection state irrelevant)
WHEN  the data table is inspected
THEN  the table has exactly 1 header row
AND   the thead contains a "Status" column header
AND   the tbody contains exactly 7 rows with the following row labels (in order):
      1. Afgewezen
      2. Geaccepteerd
      3. Verwerkt
      4. Partieel Geaccepteerd
      5. Verwerking mislukt
      6. Wordt Verwerkt
      7. Onbekend
```

**Automation script**:
```python
def test_table_has_seven_status_rows():
    expected = [
        "Afgewezen", "Geaccepteerd", "Verwerkt",
        "Partieel Geaccepteerd", "Verwerking mislukt",
        "Wordt Verwerkt", "Onbekend"
    ]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("table")
        
        rows = page.locator("tbody tr td:first-child").all_inner_texts()
        assert rows == expected
        
        browser.close()
```

---

### TC-UI-012 · DashboardTable — Header row contains all 14 domain columns

```
GIVEN the page has loaded
WHEN  the table header row is inspected
THEN  it contains column headers for DOM3 through DOM16 (14 domains)
AND   all domains are present: DOM3, DOM4, DOM5, DOM6, DOM7, DOM8, DOM9,
      DOM10, DOM11, DOM12, DOM13, DOM14, DOM15, DOM16
```

**Automation script**:
```python
def test_table_has_fourteen_domain_columns():
    domains = [f"DOM{i}" for i in range(3, 17)]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("table")
        
        header_text = page.locator("thead").inner_text()
        for domain in domains:
            assert domain in header_text, f"{domain} missing from table header"
        
        browser.close()
```

---

### TC-UI-013 · DashboardTable — Unfetched cells show "-" placeholder

```
GIVEN the page is loaded but no refresh has been triggered yet
WHEN  any data cell in the table is inspected
THEN  cells display "-" (dash placeholder) indicating no data loaded yet
```

**Automation script**:
```python
def test_unfetched_cells_show_dash():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_selector("tbody")
        
        # Get first data cell (row 1, column 2 — first domain)
        first_cell = page.locator("tbody tr:first-child td:nth-child(2)").inner_text()
        assert first_cell.strip() == "-"
        
        browser.close()
```

---

## 3. Integration Tests (Mocked API — Playwright with Route Interception)

> These tests mock the backend API responses so the full UI flow can be tested without a real
> Oracle database. The backend process does NOT need to be running.

---

### TC-INT-001 · Successful login flow mocked — dashboard becomes visible after connect

```
GIVEN the frontend is running
AND   POST /api/connect is mocked to return HTTP 200 { "status": "success" }
AND   GET /api/connection-status is mocked to return { "connected": true, "user": "TEST_USER", 
      "dsn": "DSFATN2", "default_start_date": "01012025" }
AND   GET /api/status is mocked for all domains to return zeroed counts

WHEN  the user opens http://localhost:5173
AND   types any password in the modal
AND   clicks "Initialize Connection"

THEN  the ConnectModal disappears
AND   the dashboard header shows "TEST_USER" in the "Connected as" section
AND   the dashboard header shows "DSFATN2" in the "Database" section
AND   the "Log Out" button appears in the header
AND   the "Refresh" button becomes enabled
```

**Automation script**:
```python
def test_successful_login_flow_mocked():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Mock connection-status (returns connected on second call, not connected on first)
        call_count = {"n": 0}
        def handle_status(route):
            call_count["n"] += 1
            if call_count["n"] == 1:
                route.fulfill(json={"connected": False, "user": None, "dsn": None, "default_start_date": ""})
            else:
                route.fulfill(json={"connected": True, "user": "TEST_USER", "dsn": "DSFATN2", "default_start_date": "01012025"})
        
        page.route("**/api/connection-status", handle_status)
        page.route("**/api/connect", lambda r: r.fulfill(json={"status": "success"}))
        page.route("**/api/status**", lambda r: r.fulfill(json={
            "A3":0,"G3":0,"V3":0,"PG3":0,"VM3":0,"WV3":0,"ON3":0
        }))
        
        page.goto("http://localhost:5173")
        page.wait_for_selector("input[type='password']")
        page.fill("input[type='password']", "any_password")
        page.click("button:has-text('Initialize Connection')")
        
        page.wait_for_selector("text=TEST_USER", timeout=8000)
        page.wait_for_selector("text=DSFATN2")
        
        # Modal gone
        assert page.locator("text=Database Authentication").count() == 0
        # Log Out visible
        assert page.is_visible("button:has-text('Log Out')")
        # Refresh enabled
        assert not page.locator("button:has-text('Refresh')").is_disabled()
        
        browser.close()
```

---

### TC-INT-002 · Refresh populates table cells with mocked data

```
GIVEN the user is already logged in (mocked)
AND   GET /api/status?domain=DOM3 returns:
      { "A3": 5, "G3": 100, "V3": 50, "PG3": 2, "VM3": 1, "WV3": 0, "ON3": 0 }

WHEN  the user clicks "Refresh"
THEN  the table cell for domain DOM3, row "Afgewezen" shows "5"
AND   the table cell for domain DOM3, row "Geaccepteerd" shows "100" in green
AND   the table cell for domain DOM3, row "Verwerking mislukt" shows "1" in red
```

**Automation script**:
```python
def test_refresh_populates_table_mocked():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.route("**/api/connection-status", lambda r: r.fulfill(json={
            "connected": True, "user": "U", "dsn": "D", "default_start_date": ""
        }))
        page.route("**/api/connect", lambda r: r.fulfill(json={"status": "success"}))
        
        domain_data = {
            "DOM3": {"A3":5,"G3":100,"V3":50,"PG3":2,"VM3":1,"WV3":0,"ON3":0},
        }
        def handle_status(route):
            url = route.request.url
            domain = None
            for d in domain_data:
                if f"domain={d}" in url:
                    domain = d
                    break
            data = domain_data.get(domain, {"A":0,"G":0,"V":0,"PG":0,"VM":0,"WV":0,"ON":0})
            route.fulfill(json=data)
        
        page.route("**/api/status**", handle_status)
        page.goto("http://localhost:5173")
        
        # Login
        page.fill("input[type='password']", "pw")
        page.click("button:has-text('Initialize Connection')")
        page.wait_for_selector("button:has-text('Refresh'):not([disabled])", timeout=8000)
        
        page.click("button:has-text('Refresh')")
        page.wait_for_timeout(2000)
        
        # Row 1 (Afgewezen), column DOM3 — should be "5"
        row1_dom3 = page.locator("tbody tr:nth-child(1) td:nth-child(2)").inner_text()
        assert "5" in row1_dom3
        
        browser.close()
```

---

### TC-INT-003 · Log Out button triggers disconnect and re-shows login modal

```
GIVEN the user is logged in (mocked)
AND   POST /api/disconnect is mocked to return { "status": "ok" }

WHEN  the user clicks "Log Out"
THEN  the ConnectModal appears again (modal backdrop visible)
AND   the "Log Out" button disappears from the header
AND   the table cells reset to "-" placeholders
AND   the "Connected as" label shows "-"
```

**Automation script**:
```python
def test_logout_shows_modal_again():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.route("**/api/connection-status", lambda r: r.fulfill(json={
            "connected": True, "user": "U", "dsn": "D", "default_start_date": ""
        }))
        page.route("**/api/connect",     lambda r: r.fulfill(json={"status": "success"}))
        page.route("**/api/disconnect",  lambda r: r.fulfill(json={"status": "ok"}))
        page.route("**/api/status**",    lambda r: r.fulfill(json={}))
        
        page.goto("http://localhost:5173")
        page.fill("input[type='password']", "pw")
        page.click("button:has-text('Initialize Connection')")
        page.wait_for_selector("button:has-text('Log Out')", timeout=8000)
        
        page.click("button:has-text('Log Out')")
        page.wait_for_selector("text=Database Authentication", timeout=5000)
        
        assert page.is_visible("text=Database Authentication")
        assert page.locator("button:has-text('Log Out')").count() == 0
        
        browser.close()
```

---

### TC-INT-004 · Date picker value is sent to /api/status as start_date param

```
GIVEN the user is logged in (mocked)
AND   the date picker is set to "2025-06-15"

WHEN  the user clicks "Refresh"
THEN  the HTTP request to /api/status includes query param start_date=15062025
      (i.e. DDMMYYYY format converted from YYYY-MM-DD)
```

**Automation script**:
```python
def test_date_picker_converts_format_in_request():
    captured_urls = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.route("**/api/connection-status", lambda r: r.fulfill(json={
            "connected": True, "user": "U", "dsn": "D", "default_start_date": ""
        }))
        page.route("**/api/connect", lambda r: r.fulfill(json={"status": "success"}))
        
        def capture_status(route):
            captured_urls.append(route.request.url)
            route.fulfill(json={})
        
        page.route("**/api/status**", capture_status)
        page.goto("http://localhost:5173")
        page.fill("input[type='password']", "pw")
        page.click("button:has-text('Initialize Connection')")
        page.wait_for_selector("button:has-text('Refresh'):not([disabled])", timeout=8000)
        
        # Set date picker to 2025-06-15
        page.fill("#start-date-picker", "2025-06-15")
        page.click("button:has-text('Refresh')")
        page.wait_for_timeout(1000)
        
        assert any("start_date=15062025" in url for url in captured_urls), \
            f"Expected start_date=15062025 in URLs: {captured_urls}"
        
        browser.close()
```

---

### TC-INT-005 · Selecting a different Message Subtype sends it in the API request

```
GIVEN the user is logged in (mocked)
WHEN  the user selects "VolumeSeriesNotification" from the Message Subtype dropdown
AND   clicks "Refresh"
THEN  the request to /api/status includes subtype=VolumeSeriesNotification
```

**Automation script**:
```python
def test_subtype_selection_sent_in_request():
    captured_urls = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.route("**/api/connection-status", lambda r: r.fulfill(json={
            "connected": True, "user": "U", "dsn": "D", "default_start_date": ""
        }))
        page.route("**/api/connect", lambda r: r.fulfill(json={"status": "success"}))
        
        def capture(route):
            captured_urls.append(route.request.url)
            route.fulfill(json={})
        page.route("**/api/status**", capture)
        
        page.goto("http://localhost:5173")
        page.fill("input[type='password']", "pw")
        page.click("button:has-text('Initialize Connection')")
        page.wait_for_selector("#subtype-select", timeout=8000)
        
        page.select_option("#subtype-select", "VolumeSeriesNotification")
        page.click("button:has-text('Refresh')")
        page.wait_for_timeout(1000)
        
        assert any("subtype=VolumeSeriesNotification" in url for url in captured_urls)
        
        browser.close()
```

---

### TC-INT-006 · 401 from /api/status causes re-login modal to appear

```
GIVEN the user is logged in (mocked)
AND   GET /api/status returns HTTP 401

WHEN  the user clicks Refresh
THEN  the ConnectModal appears again (session is treated as expired)
```

**Automation script**:
```python
def test_401_from_status_triggers_relogin():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.route("**/api/connection-status", lambda r: r.fulfill(json={
            "connected": True, "user": "U", "dsn": "D", "default_start_date": ""
        }))
        page.route("**/api/connect", lambda r: r.fulfill(json={"status": "success"}))
        page.route("**/api/status**", lambda r: r.fulfill(status=401, json={"detail": "Unauthorized"}))
        
        page.goto("http://localhost:5173")
        page.fill("input[type='password']", "pw")
        page.click("button:has-text('Initialize Connection')")
        page.wait_for_selector("button:has-text('Refresh'):not([disabled])", timeout=8000)
        
        page.click("button:has-text('Refresh')")
        page.wait_for_selector("text=Database Authentication", timeout=8000)
        
        assert page.is_visible("text=Database Authentication")
        
        browser.close()
```

---

## 4. Test Execution Guide

### 4.1 Running All API Tests

```bash
cd c:\development\AntiGravity\Dashboard\Tests
pytest test_api_*.py -v --tb=short
```

### 4.2 Running All UI / Integration Tests

```bash
cd c:\development\AntiGravity\Dashboard\Tests
pytest test_ui_*.py test_integration_*.py -v --tb=short
```

### 4.3 Running All Tests

```bash
cd c:\development\AntiGravity\Dashboard\Tests
pytest -v --tb=short
```

### 4.4 Suggested File Layout for Tests/

```
Tests/
├── AutomatedTesting.md          ← this file
├── conftest.py                  ← shared fixtures / base URLs
├── test_api_connection.py       ← TC-API-001 to TC-API-005
├── test_api_status.py           ← TC-API-005 to TC-API-009
├── test_api_cors.py             ← TC-API-010
├── test_ui_modal.py             ← TC-UI-001 to TC-UI-005
├── test_ui_header.py            ← TC-UI-006 to TC-UI-010
├── test_ui_table.py             ← TC-UI-011 to TC-UI-013
└── test_integration.py          ← TC-INT-001 to TC-INT-006
```

---

## 5. Test Coverage Summary

| Area | # TCs | What is Verified |
|------|-------|-----------------|
| API – Connection | 5 | Status schema, connect/disconnect contract, auth errors |
| API – Status | 4 | Subtype validation, missing params, pool-absent 500 |
| API – CORS | 1 | localhost origin accepted in LOCAL_MODE |
| UI – Modal | 5 | Visibility, defaults, env→user mapping, error display, spinner |
| UI – Header | 5 | Refresh disabled state, subtype dropdown, date picker, info labels |
| UI – Table | 3 | Row count, domain columns, placeholder state |
| Integration | 6 | Full login flow, data population, logout, date format, subtype param, 401 re-auth |
| **Total** | **29** | |

---

## 6. Known Constraints & Assumptions

- Tests in sections 1–2 require the **backend running** (`uvicorn`) but no live Oracle DB.
- Tests in section 3 use Playwright **route mocking** and do **not** require the backend at all.
- The `#env-select` and `#subtype-select` IDs are sourced directly from the component source (`ConnectModal.jsx` / `App.jsx`). If IDs change, update selectors here.
- The `#start-date-picker` ID is on the `<input type="date">` in `App.jsx`.
- Domain list `DOM3–DOM16` is hardcoded in `useDashboardRefresh.js` — if this changes, TC-UI-012 must be updated.
- Status row labels are defined in `DashboardTable.jsx` — if labels change, TC-UI-011 must be updated.
