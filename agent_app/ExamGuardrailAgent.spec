import sys

a = Analysis(
    ['guardrail_app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('../exam_guardrail', 'exam_guardrail'),
        ('icon.png', '.'),
        ('icon.ico', '.')
    ] if sys.platform == 'win32' else [('../exam_guardrail', 'exam_guardrail')],
    hiddenimports=['psutil', 'httpx', 'pystray', 'PIL', 'tkinter'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ExamGuardrailAgent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version='agent_version_info.txt' if sys.platform == 'win32' else None,
    icon=['icon.ico'] if sys.platform == 'win32' else None,
)
