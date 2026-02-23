# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for FaceGo — app.py
# Build:  pyinstaller facego.spec

import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_all, collect_data_files

block_cipher = None

# ── Collect everything from heavy packages ────────────────────────────────────
insightface_datas,  insightface_bins,  insightface_hiddens  = collect_all("insightface")
onnxruntime_datas,  onnxruntime_bins,  onnxruntime_hiddens  = collect_all("onnxruntime")
textual_datas,      textual_bins,      textual_hiddens      = collect_all("textual")
rich_datas,      rich_bins,      rich_hiddens      = collect_all("rich")

# ── Extra data files to bundle alongside the exe ─────────────────────────────
# config.yaml is read at startup; include a default copy.
# registered_faces.pkl and model weights stay OUTSIDE the exe.
extra_datas = [
    ("config.yaml", "."),   # destination: root of the bundle
]

# ── Analysis ──────────────────────────────────────────────────────────────────
a = Analysis(
    ["app.py"],
    pathex=[str(Path(".").resolve())],
    binaries=(
        insightface_bins
        + onnxruntime_bins
        + textual_bins
        + rich_bins
    ),
    datas=(
        insightface_datas
        + onnxruntime_datas
        + textual_datas
        + extra_datas
        + rich_datas
    ),
    hiddenimports=(
        insightface_hiddens
        + onnxruntime_hiddens
        + textual_hiddens
        + rich_hiddens
        + [
            # cv2 helpers
            "cv2",
            "cv2.cv2",
            # numpy
            "numpy",
            "numpy.core._multiarray_umath",
            "numpy.core._multiarray_tests",
            # scipy (insightface may need it)
            "scipy",
            "scipy.special._ufuncs_cxx",
            "scipy.linalg",
            # sklearn (insightface metric helpers)
            "sklearn",
            "sklearn.utils._cython_blas",
            # standard lib
            "pickle",
            "csv",
            "yaml",
            "pathlib",
            "threading",
            "dataclasses"
        ]
    ),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "IPython",
        "jupyter",
        "notebook",
        "pytest",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# ── PYZ (pure-Python archive) ─────────────────────────────────────────────────
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ── EXE ───────────────────────────────────────────────────────────────────────
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="facego",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,           # set False if UPX causes issues with antivirus
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,       # keep True — Textual needs a real terminal
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,          # replace with "icon.ico" if you have one
)
