' Starts 7 Days To Die Server Manager at Windows logon without opening a browser.
Option Explicit
Dim sh, fso, scriptDir, ps1, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = scriptDir & "\StartSevenDaysManager.ps1"
cmd = "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File """ & ps1 & """ -NoBrowser"
sh.Run cmd, 7, False
