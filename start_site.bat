@echo off
echo ========================================================
echo       Starting Fiero News Website Archive Server
echo ========================================================
echo.
echo Opening http://localhost:8530 in your default browser...
start http://localhost:8530
echo.
echo Server running (includes PFF Forum Viewer API).
echo Press Ctrl+C to stop the server anytime.
echo.
python server.py
