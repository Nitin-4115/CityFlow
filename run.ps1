# CityFlow PowerShell Runner
$env:PYTHONHOME = $null
$env:PYTHONPATH = $null

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   CityFlow - Smart Transit and Real-Time Traffic Platform" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$CondaDir = "$env:USERPROFILE\.conda\envs\cityflow-env"
if (-not (Test-Path $CondaDir)) {
    $CondaDir = "C:\Users\nitin\.conda\envs\cityflow-env"
}

$CondaPython = "$CondaDir\python.exe"

if (Test-Path $CondaPython) {
    Write-Host "[INFO] Using Conda Environment: $CondaDir" -ForegroundColor Green
    $env:PATH = "$CondaDir;$CondaDir\Scripts;$CondaDir\Library\bin;$CondaDir\Library\usr\bin;$CondaDir\Library\mingw-w64\bin;$env:PATH"
    $env:CONDA_PREFIX = $CondaDir
    $PythonCmd = $CondaPython
} else {
    Write-Host "[WARNING] Conda environment cityflow-env not found at $CondaDir. Trying default python..." -ForegroundColor Yellow
    $PythonCmd = "python"
}

& $PythonCmd run_all.py $args
