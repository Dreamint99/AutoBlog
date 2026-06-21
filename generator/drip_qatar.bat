@echo off
REM Daily drip for QatarExperts — 3 new articles/day until it reaches 50.
cd /d "%~dp0"
".venv\Scripts\python.exe" drip.py qatarexperts 3 50
