@echo off
echo === Backend (Django) setup ===
cd backend
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python manage.py makemigrations api
python manage.py migrate
python manage.py seed
cd ..
echo === Frontend (React) setup ===
cd frontend
call npm install
cd ..
echo.
echo DONE. Now double-click run.bat (or type: run.bat)
