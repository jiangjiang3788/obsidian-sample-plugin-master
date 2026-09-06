@echo off
setlocal
cd /d "%~dp0"

echo [Think OS] Restore original test workflow...

for /f "usebackq delims=" %%F in ("DELETE_TESTINFRA_FILES.txt") do (
  if exist "%%F" del /f /q "%%F"
)

echo [Think OS] Done.
echo [Think OS] Test commands restored to the original direct-Jest workflow.
echo [Think OS] Use: npm run 测试
endlocal
