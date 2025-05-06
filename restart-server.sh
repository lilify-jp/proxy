#!/bin/bash

echo "Webプロキシサーバーを再起動しています..."
echo

# 実行中のNode.jsプロセスを検索
echo "実行中のNode.jsプロセスを確認しています..."
ps aux | grep node

# ユーザーに確認
read -p "Node.jsプロセスを終了してサーバーを再起動しますか？ (Y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "再起動をキャンセルしました。"
    read -p "Enterキーを押して終了..."
    exit 0
fi

# Node.jsプロセスを終了
echo "Node.jsプロセスを終了しています..."
pkill -f node
sleep 2

# サーバーを再起動
echo "サーバーを再起動しています..."
cd "$(dirname "$0")"
nohup npm start > server.log 2>&1 &

echo "サーバーの再起動が完了しました。"
echo "ブラウザで http://localhost:3000 にアクセスしてください。"
read -p "Enterキーを押して終了..."