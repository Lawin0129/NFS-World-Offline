@echo off
setlocal EnableDelayedExpansion

set dependencies=express xml2js compression
set installNeeded=0

for %%d in (%dependencies%) do (
    if not exist "node_modules\%%d" (
        echo Dependency %%d is missing.
        set installNeeded=1
    )
)

if !installNeeded! == 1 (
    echo.
    echo One or more dependencies are missing. Running npm install...
    call npm install
)

cls
endlocal
@echo on

node src/index.js
pause