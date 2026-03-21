@echo off
REM ============================================================
REM ExamGuardrail Agent — Windows Build Script
REM Creates a single .exe that students can run without Python
REM ============================================================

echo Installing dependencies...
pip install -r requirements.txt
pip install pyinstaller

echo.
echo Building ExamGuardrailAgent.exe...
python -m PyInstaller ^
    --onefile ^
    --windowed ^
    --version-file "agent_version_info.txt" ^
    --add-data "..\exam_guardrail;exam_guardrail" ^
    --hidden-import psutil ^
    --hidden-import httpx ^
    --hidden-import pystray ^
    --hidden-import PIL ^
    --hidden-import tkinter ^
    --distpath "%OUTDIR%" ^
    guardrail_app.py

echo.
echo Building ExamGuardrailUpdater.exe...
python -m PyInstaller ^
    --onefile ^
    --windowed ^
    --name "ExamGuardrailUpdater" ^
    --icon "icon.ico" ^
    --version-file "updater_version_info.txt" ^
    --hidden-import httpx ^
    --hidden-import tkinter ^
    --distpath "%OUTDIR%" ^
    updater.py

echo.
echo ============================================================
echo Build complete!
echo Output: %OUTDIR%\ExamGuardrailAgent.exe
echo Share this .exe with students before the exam.
echo ============================================================
pause
