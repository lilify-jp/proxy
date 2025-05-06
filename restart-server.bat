@echo off
echo Webプロキシサーバーを再起動しています...
echo.

REM 実行中のNode.jsプロセスを検索
echo 実行中のNode.jsプロセスを確認しています...
tasklist /fi "imagename eq node.exe" /fo table

REM ユーザーに確認
set /p confirm=Node.jsプロセスを終了してサーバーを再起動しますか？ (Y/N): 

if /i "%confirm%" neq "Y" (
    echo 再起動をキャンセルしました。
    pause
    exit /b
)

REM Node.jsプロセスを終了
echo Node.jsプロセスを終了しています...
taskkill /f /im node.exe
timeout /t 2 /nobreak > nul

REM サーバーを再起動
echo サーバーを再起動しています...
start cmd /k "cd /d "%~dp0" && npm start"

echo サーバーの再起動が完了しました。
echo ブラウザで http://localhost:3000 にアクセスしてください。
pause