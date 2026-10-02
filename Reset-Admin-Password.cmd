@echo off
setlocal EnableExtensions
title 7 Days To Die Server Manager — Reset admin password

REM One-shot helper: restarts the manager and prints a new Genis221 temporary password
REM in the console window. Optional: set SEVENDTD_ADMIN_PASSWORD first to choose the password.

cd /d "%~dp0"
echo This will reset the Genis221 admin password and sign everyone out of that account.
echo.
if defined SEVENDTD_ADMIN_PASSWORD (
  echo Using SEVENDTD_ADMIN_PASSWORD from the environment.
) else (
  echo A new temporary password will be printed in the manager console after restart.
)
echo.
pause

set "SEVENDTD_RESET_ADMIN_PASSWORD=1"
call "%~dp0Start 7DTD Manager.cmd"
