@echo off
echo Webプロキシサーバーを拡張メモリモードで起動しています...
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

REM サーバーを起動
echo サーバーを拡張メモリモード（4GB）で起動しています...
echo ブラウザで http://localhost:3000 にアクセスしてください。
echo.
echo このウィンドウを閉じるとサーバーが停止します。
echo.
call npm start

pause