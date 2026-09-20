@echo off
setlocal enabledelayedexpansion
title CityFlow - Smart City Analytics Platform

set "PYTHONHOME="
set "PYTHONPATH="

echo ======================================================================
echo    CityFlow - Smart Transit and Real-Time Traffic Platform
echo ======================================================================

set CONDA_DIR=%USERPROFILE%\.conda\envs\cityflow-env
if not exist "%CONDA_DIR%" (
    set CONDA_DIR=C:\Users\nitin\.conda\envs\cityflow-env
)

if exist "%CONDA_DIR%\python.exe" (
    set "PATH=%CONDA_DIR%;%CONDA_DIR%\Scripts;%CONDA_DIR%\Library\bin;%CONDA_DIR%\Library\usr\bin;%CONDA_DIR%\Library\mingw-w64\bin;%PATH%"
    set "CONDA_PREFIX=%CONDA_DIR%"
    set PYTHON_CMD="%CONDA_DIR%\python.exe"
) else if exist ".venv\Scripts\python.exe" (
    set "PYTHON_CMD=.venv\Scripts\python.exe"
) else (
    echo [WARNING] 'cityflow-env' not found. Checking conda command...
    where conda >nul 2>&1
    if !errorlevel! equ 0 (
        call conda activate cityflow-env 2>nul
        set PYTHON_CMD=python
    ) else (
        where python >nul 2>&1
        if !errorlevel! equ 0 (
            set PYTHON_CMD=python
        ) else (
            echo [ERROR] No Python environment detected.
            echo [*] Running setup_env.bat to build your environment automatically...
            call setup_env.bat
            exit /b 0
        )
    )
)

%PYTHON_CMD% run_all.py %*

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] CityFlow exited with code %errorlevel%.
)

pause
