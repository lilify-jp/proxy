@echo off
echo Webプロキシを安定モードで起動しています...
echo.

REM Node.jsがインストールされているか確認
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo エラー: Node.jsがインストールされていません。
    echo Node.jsをhttps://nodejs.org/からダウンロードしてインストールしてください。
    pause
    exit /b 1
)

REM カレントディレクトリに移動
cd /d "%~dp0"

REM 依存関係がインストールされているか確認
if not exist node_modules (
    echo 依存関係をインストールしています...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo エラー: 依存関係のインストールに失敗しました。
        pause
        exit /b 1
    )
)

REM Node.jsのメモリ制限を増やす
set NODE_OPTIONS=--max-old-space-size=4096 --expose-gc

REM ブラウザを起動
start http://localhost:3000

echo サーバーを安定モードで起動しています...
echo ブラウザで http://localhost:3000 にアクセスしてください。
echo.
echo このウィンドウを閉じるとサーバーが停止します。
echo.

:restart_loop
echo サーバーを起動しています... (%time%)
node --expose-gc server.js

echo サーバーが停止しました。3秒後に再起動します... (%time%)
timeout /t 3 /nobreak > nul
goto restart_loop