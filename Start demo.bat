@echo off
cd /d "%~dp0"
title Rebotech CRM demo
where node >nul 2>nul || (echo Node.js is needed. Install it from https://nodejs.org and run this again. & pause & exit /b 1)
if not exist out\index.html (
  echo First run, building the demo...
  if not exist node_modules call npm install
  call npm run build || (pause & exit /b 1)
)
echo Keep this window open while you show the demo. Close it to stop.
node serve.mjs --open
pause
