# -*- mode: python ; coding: utf-8 -*-

import os
import sys

block_cipher = None

# Path to your backend main.py
backend_main_path = os.path.join(
    os.path.abspath(os.path.dirname(sys.argv[0])),
    'victoria-store-backend',
    'src',
    'main.py'
)

# Path to your frontend dist folder
frontend_dist_path = os.path.join(
    os.path.abspath(os.path.dirname(sys.argv[0])),
    'victoria-store-frontend',
    'dist'
)

a = Analysis(
    [backend_main_path],
    pathex=[],
    binaries=[],
    datas=[
        (frontend_dist_path, 'dist') # Include the entire frontend dist folder
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='Victoria Store',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True, # Set to True if you want a console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

