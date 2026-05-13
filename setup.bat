@echo off
REM Quick install for Windows

echo Installing Work Hours Tracker dependencies...
echo.

echo Backend...
cd backend
call npm install
if not exist .env (
  copy .env.example .env
  echo   ^> Created backend\.env (please edit it with your PostgreSQL settings!)
)
cd ..

echo.
echo Frontend...
cd frontend
call npm install
cd ..

echo.
echo Install complete!
echo.
echo IMPORTANT: Before starting, edit backend\.env with your PostgreSQL connection details.
echo See the README for setup instructions.
echo.
echo To run the app, open TWO command prompts:
echo   Window 1:  cd backend  ^&^& npm start
echo   Window 2:  cd frontend ^&^& npm run dev
echo.
echo Then open http://localhost:5173
pause
