@echo off
title 7 Days To Die Server Manager
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0StartSevenDaysManager.ps1"
if errorlevel 1 pause

