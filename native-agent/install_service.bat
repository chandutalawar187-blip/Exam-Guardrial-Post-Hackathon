@echo off
setlocal
echo Installing ExamGuardrail Native Services...

:: 1. Schedule Task for Logon (Silent Background Start)
set AGENT_PATH=%~dp0launch_silent.pyw
set PYTHON_PATH=pythonw.exe
schtasks /create /tn "ExamGuardrailAgent" /tr "%PYTHON_PATH% %AGENT_PATH%" /sc onlogon /rl highest /f

:: 2. Register Custom Protocol (examguardrail://)
:: This allows the web app to launch the agent automatically
echo Registering Protocol Handler...

set "PROTO_ROOT=HKCR\examguardrail"
set "BAT_PATH=%~dp0exam_start.bat"

reg add "%PROTO_ROOT%" /ve /t REG_SZ /d "URL:ExamGuardrail Protocol" /f
reg add "%PROTO_ROOT%" /v "URL Protocol" /t REG_SZ /d "" /f
reg add "%PROTO_ROOT%\shell\open\command" /ve /t REG_SZ /d "\"%BAT_PATH%\" \"%%1\"" /f

echo.
echo Done! ExamGuardrail is now fully integrated.
echo 1. Agent will start automatically at Logon.
echo 2. Web App can now launch the agent automatically.
pause
