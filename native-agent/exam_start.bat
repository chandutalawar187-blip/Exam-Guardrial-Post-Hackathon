@echo off
setlocal

set SESSION_ID=demo-test-001
set AGENT_TOKEN=dev-token
set API_BASE=http://localhost:8000/api

pythonw launch_silent.pyw

start http://localhost:5173/exam

exit
