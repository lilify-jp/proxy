#!/bin/bash

echo "Webプロキシサーバーを起動しています..."
echo

# Node.jsがインストールされているか確認
if ! command -v node &> /dev/null; then
    echo "エラー: Node.jsがインストールされていません。"
    echo "Node.jsをhttps://nodejs.org/からダウンロードしてインストールしてください。"
    read -p "Enterキーを押して終了..."
    exit 1
fi

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# 依存関係がインストールされているか確認
if [ ! -d "node_modules" ]; then
    echo "依存関係をインストールしています..."
    npm install
    if [ $? -ne 0 ]; then
        echo "エラー: 依存関係のインストールに失敗しました。"
        read -p "Enterキーを押して終了..."
        exit 1
    fi
fi

# サーバーを起動
echo "サーバーを起動しています..."
echo "ブラウザで http://localhost:3000 にアクセスしてください。"
echo
echo "Ctrl+Cを押すとサーバーが停止します。"
echo

npm start

read -p "Enterキーを押して終了..."