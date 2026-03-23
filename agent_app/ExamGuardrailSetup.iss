; ExamGuardrail Professional Installer Script (Inno Setup)
; =======================================================
; This script generates a professional .exe installer for ExamGuardrail.

[Setup]
AppId={{D1A3B9C5-7E2D-4C6A-8F9B-2E1A3C4D5E6F}
AppName=ExamGuardrail Agent
AppVersion=1.7.0
AppPublisher=ExamGuardrail Security
AppPublisherURL=https://exam-guardrial-post-hackathon.vercel.app
AppSupportURL=https://exam-guardrial-post-hackathon.vercel.app
AppMutex=ExamGuardrailAgentMutex
CloseApplications=force
UninstallDisplayIcon={app}\icon.ico
DefaultDirName={localappdata}\ExamGuardrail
DefaultGroupName=ExamGuardrail
AllowNoIcons=yes
OutputDir=.
OutputBaseFilename=ExamGuardrailSetup
SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\ExamGuardrailAgent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\ExamGuardrailUpdater.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "icon.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\ExamGuardrail Agent"; Filename: "{app}\ExamGuardrailAgent.exe"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\ExamGuardrail Agent"; Filename: "{app}\ExamGuardrailAgent.exe"; Tasks: desktopicon; IconFilename: "{app}\icon.ico"

[Run]
Filename: "{app}\ExamGuardrailAgent.exe"; Description: "{cm:LaunchProgram,ExamGuardrail Agent}"; Flags: nowait postinstall skipifsilent
