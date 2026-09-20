@echo off
setlocal enabledelayedexpansion
title CityFlow - Environment Setup Wizard

echo ======================================================================
echo    CityFlow - 1-Click Environment Setup Wizard
echo ======================================================================
echo.

where conda >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Found Conda package manager.
    echo [*] Creating 'cityflow-env' with Python 3.10 and all dependencies...
    call conda env create -f environment.yml --force
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] Conda environment 'cityflow-env' created successfully!
        echo [*] You can now double-click run.bat to launch the app anytime.
        echo.
        pause
        exit /b 0
    ) else (
        echo [WARNING] Conda environment creation returned non-zero code. Trying pip fallback...
    )
)

echo [*] Setting up Python virtual environment (venv)...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Neither Conda nor Python was found on your system PATH.
    echo Please install Python 3.10+ from https://python.org or Miniconda.
    pause
    exit /b 1
)

python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo [SUCCESS] Python virtual environment created in .venv/
echo [*] You can now run: run.bat
echo.
pause
