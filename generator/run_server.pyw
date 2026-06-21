"""run_server.pyw — start the admin panel with no console window.
Double-click to run. Logs to output/server.log.
"""
import os
import subprocess
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.makedirs("output", exist_ok=True)

subprocess.Popen(
    [sys.executable, "admin/app.py"],
    cwd=os.path.dirname(os.path.abspath(__file__)),
    stdout=open("output/server.log", "a", encoding="utf-8"),
    stderr=subprocess.STDOUT,
    creationflags=0x00000008,  # DETACHED_PROCESS
)
