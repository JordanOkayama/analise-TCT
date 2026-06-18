$ErrorActionPreference = "Stop"
Write-Host "Iniciando backend em http://127.0.0.1:8000"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd backend; .\run.ps1" -WindowStyle Normal
Write-Host "Iniciando frontend em http://127.0.0.1:5173"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd frontend; npm install; npm run dev" -WindowStyle Normal

