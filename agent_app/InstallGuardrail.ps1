# ExamGuardrail Professional Installer
# ========================================
# This script installs the ExamGuardrail Agent, creates shortcuts, and registers it.

$ErrorActionPreference = "Stop"

# 1. Setup Paths
$AppName = "ExamGuardrail"
$InstallDir = Join-Path $env:LocalAppData $AppName
$BinDir = Join-Path $InstallDir "bin"
$IconPath = Join-Path $InstallDir "icon.png"
$ExeName = "ExamGuardrailAgent.exe"
$SourceExe = "$PSScriptRoot\$ExeName"
$SourceIcon = "$PSScriptRoot\icon.png"

Write-Host "--- Installing $AppName ---" -ForegroundColor Cyan

# 2. Create Directories
if (-not (Test-Path $InstallDir)) { New-Item -Path $InstallDir -ItemType Directory | Out-Null }
if (-not (Test-Path $BinDir)) { New-Item -Path $BinDir -ItemType Directory | Out-Null }

# 3. Copy Files
Write-Host "Copying application files..."
if (Test-Path $SourceExe) { Copy-Item $SourceExe (Join-Path $BinDir $ExeName) -Force }
else { Write-Warning "Source executable not found at $SourceExe. Please run the build first." }

if (Test-Path $SourceIcon) { Copy-Item $SourceIcon $IconPath -Force }

# 4. Create Desktop Shortcut
Write-Host "Creating Desktop shortcut..."
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\$AppName.lnk")
$Shortcut.TargetPath = Join-Path $BinDir $ExeName
$Shortcut.WorkingDirectory = $BinDir
$Shortcut.IconLocation = "$BinDir\$ExeName,0" # Uses embedded icon from EXE
$Shortcut.Save()

# 5. Add to Start Menu
Write-Host "Adding to Start Menu..."
$StartMenuPath = Join-Path $env:AppData "Microsoft\Windows\Start Menu\Programs\$AppName"
if (-not (Test-Path $StartMenuPath)) { New-Item -Path $StartMenuPath -ItemType Directory | Out-Null }
$StartShortcut = $WshShell.CreateShortcut("$StartMenuPath\$AppName.lnk")
$StartShortcut.TargetPath = Join-Path $BinDir $ExeName
$StartShortcut.WorkingDirectory = $BinDir
$StartShortcut.Save()

Write-Host "`nSuccessfully installed $AppName!" -ForegroundColor Green
Write-Host "You can now launch it from your Desktop or Start Menu."
Pause
