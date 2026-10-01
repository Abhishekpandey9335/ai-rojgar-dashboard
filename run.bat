@echo off
start "Backend - Django" cmd /k "cd backend && call venv\Scripts\activate.bat && python manage.py runserver 8000"
start "Frontend - React" cmd /k "cd frontend && npm run dev"
timeout /t 6 >nul
start http://localhost:5173
