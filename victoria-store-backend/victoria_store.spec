# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

import os
from PyInstaller.utils.hooks import collect_submodules

BASE_DIR = os.getcwd()  # 👈 بدل __file__ بـ getcwd
FRONTEND_DIST = os.path.join(BASE_DIR, "victoria-store-frontend", "dist")
DATABASE_DIR = os.path.join(BASE_DIR, "victoria-store-backend", "database")

a = Analysis(
    ['victoria-store-backend/run.py'],  # خلي المسار يبدأ من جذر المشروع
    pathex=[BASE_DIR],
    binaries=[],
    datas=[
        (FRONTEND_DIST, "dist"),
        (DATABASE_DIR, "database")
    ],
    hiddenimports=collect_submodules("src"),
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="VictoriaStore",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="VictoriaStore"
)
