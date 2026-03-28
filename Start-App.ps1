# Start-App.ps1
# This script starts both the backend and frontend of the DashboardVSV application in separate windows.

Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host "   Starting DashboardVSV Application...            " -ForegroundColor Cyan
Write-Host "---------------------------------------------------" -ForegroundColor Cyan

# 1. Start Backend
Write-Host "[1/2] Launching Backend (FastAPI) in a new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Starting Backend...'; uvicorn main:app --reload --host 0.0.0.0 --port 8000"

# 2. Start Frontend
Write-Host "[2/2] Launching Frontend (Vite/React) in a new window..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Frontend...'; npm run dev"

Write-Host "`nAll systems go! Check the newly opened windows for logs." -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "---------------------------------------------------" -ForegroundColor Cyan
