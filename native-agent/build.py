# native-agent/build.py

"""
PyInstaller build script — creates a standalone .exe for the native agent.
Usage: python build.py
"""

import PyInstaller.__main__
import platform

def build():
    args = [
        'agent.py',
        '--onefile',
        '--name', 'ExamGuardrail-Agent',
        '--hidden-import', 'psutil',
        '--hidden-import', 'httpx',
    ]

    if platform.system() == 'Windows':
        args.append('--noconsole')

    print('[BUILD] Creating standalone executable...')
    PyInstaller.__main__.run(args)
    print('[BUILD] Done! Check the dist/ folder.')


if __name__ == '__main__':
    build()
