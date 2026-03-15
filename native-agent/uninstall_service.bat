@echo off
echo Uninstalling ExamGuardrail Services...

:: 1. Remove Scheduled Task
schtasks /delete /tn "ExamGuardrailAgent" /f

:: 2. Remove Protocol Handler
reg delete "HKCR\examguardrail" /f

echo.
echo ExamGuardrail has been uninstalled.
pause
