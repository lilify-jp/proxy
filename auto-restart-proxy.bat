@echo off
echo Webプロキシサーバーを自動再起動モードで起動しています...
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
set NODE_OPTIONS=--max-old-space-size=4096

echo サーバーを自動再起動モードで起動しています...
echo ブラウザで http://localhost:3000 にアクセスしてください。
echo.
echo このウィンドウを閉じるとサーバーが停止します。
echo.

:restart_loop
echo サーバーを起動しています... (%time%)
call npm start

echo サーバーが停止しました。5秒後に再起動します... (%time%)
timeout /t 5 /nobreak > nul
goto restart_loop