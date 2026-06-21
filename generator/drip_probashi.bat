@echo off
REM Daily drip for Probashi Info (WordPress, probashiinfo.com) — 1 new Bengali
REM article/day, perpetual. Site already has 100+ posts, so we use a very high
REM "target" (never reached) = post 1/day forever. Drip slow on a real domain
REM (scaled-content-abuse safe). Dedup checks the 100 most-recent WP posts.
cd /d "%~dp0"
".venv\Scripts\python.exe" drip.py probashiinfo 1 999999
