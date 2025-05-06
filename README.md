# Web Proxy

このプロジェクトは、制限されたウェブサイトにアクセスするためのカスタマイズ可能なウェブプロキシです。Node.jsとExpressを使用して構築されています。

## 機能

- HTTP/HTTPSプロトコルの選択
- JavaScriptの削除オプション
- iframeの削除オプション
- カスタムUser-Agentの設定
- タイムアウト設定
- レスポンシブデザイン
- リダイレクト処理の改善
- フォーム送信のサポート

## インストール方法

1. リポジトリをクローンまたはダウンロードします
2. 必要なパッケージをインストールします:

```bash
npm install
```

3. サーバーを起動します:

```bash
npm start
```

4. ブラウザで `http://localhost:3000` にアクセスします

## カスタマイズ

### スタイルのカスタマイズ

`styles.css` ファイルを編集することで、アプリケーションの外観をカスタマイズできます。CSSの変数を変更することで、色やテーマを簡単に変更できます:

```css
:root {
    --primary-color: #3498db;
    --secondary-color: #2980b9;
    --background-color: #f5f5f5;
    --text-color: #333;
    --border-color: #ddd;
    --success-color: #2ecc71;
    --error-color: #e74c3c;
    --warning-color: #f39c12;
}
```

### 追加オプションの実装

新しいオプションを追加するには:

1. `index.html` の `.options-panel` セクションに新しいオプションを追加します
2. `script.js` でオプションの値を取得するロジックを追加します
3. `server.js` の `/api/proxy` エンドポイントで新しいオプションを処理します

### User-Agentの追加

`script.js` の `getUserAgent()` 関数に新しいUser-Agentを追加できます:

```javascript
function getUserAgent() {
    switch (userAgentSelect.value) {
        case 'mobile':
            return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
        case 'desktop':
            return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        case 'new-agent':
            return 'Your new user agent string';
        case 'custom':
            return customUserAgent.value || navigator.userAgent;
        default:
            return navigator.userAgent;
    }
}
```

## セキュリティ上の注意

このプロキシは教育目的で作成されています。以下の点に注意してください:

- 機密情報（パスワードなど）を入力するサイトには使用しないでください
- すべてのウェブサイトが正しく表示されるとは限りません
- 一部のウェブサイトはプロキシの使用を検出し、アクセスをブロックする場合があります

## 簡単な起動方法

### Windows

1. `start-proxy.bat` ファイルをダブルクリックします
2. ブラウザで `http://localhost:3000` にアクセスします

### Mac/Linux

1. ターミナルを開きます
2. プロジェクトディレクトリに移動します
3. 以下のコマンドを実行してスクリプトに実行権限を付与します:
   ```
   chmod +x start-proxy.sh
   ```
4. スクリプトを実行します:
   ```
   ./start-proxy.sh
   ```
5. ブラウザで `http://localhost:3000` にアクセスします

## トラブルシューティング

### サーバーに接続できない場合

- サーバーが実行中であることを確認してください
  - Windowsの場合: `start-proxy.bat` を実行
  - Mac/Linuxの場合: `./start-proxy.sh` を実行
- コマンドラインで直接起動する場合:
  ```
  npm install
  npm start
  ```
- ポート3000が他のアプリケーションで使用されていないことを確認してください
  - 使用中の場合は、`server.js` の `PORT` 変数を別の値に変更してください
- ファイアウォールの設定を確認してください
- ブラウザのコンソールでエラーメッセージを確認してください (F12キーを押して開発者ツールを開く)

### "Failed to fetch" エラーが表示される場合

このエラーは通常、以下の原因で発生します:
1. サーバーが起動していない
2. ブラウザがサーバーに接続できない
3. CORSポリシーの問題

解決策:
- サーバーが正しく起動していることを確認してください
- 同じマシン上でブラウザとサーバーを実行していることを確認してください
- ファイアウォールがポート3000への接続を許可していることを確認してください

### 2回目のアクセスでエラーが発生する場合

大きなウェブサイト（GitHub、Twitterなど）にアクセスした後にエラーが発生する場合は、以下の対処法を試してください：

1. サーバーを再起動する
   - Windowsの場合: `restart-server.bat` を実行
   - Mac/Linuxの場合: `./restart-server.sh` を実行

2. タイムアウト値を増やす
   - オプション設定でタイムアウト値を60秒に増やしてみてください

3. スクリプトと画像を削除する
   - 「スクリプトを削除」オプションをオンにしてみてください
   - これにより、メモリ使用量が減少し、処理が高速化される場合があります

### リンクがプロキシを通さずに直接開く場合

一部のリンクがプロキシを通さずに直接開いてしまう場合は、以下の対処法を試してください：

1. 最新バージョンを使用する
   - 最新のコードではリンク処理が改善されています

2. 右クリックメニューを使用しない
   - リンクを右クリックして「新しいタブで開く」などを選択すると、プロキシを通さずに直接開く場合があります
   - 代わりに、リンクを左クリックしてプロキシを通してアクセスしてください

3. JavaScriptを有効にする
   - プロキシの機能はJavaScriptに依存しているため、ブラウザでJavaScriptが有効になっていることを確認してください

### ウェブサイトが正しく表示されない場合

- 「スクリプトを削除」オプションをオフにしてみてください
- 別のUser-Agentを試してみてください
- タイムアウト値を増やしてみてください
- 一部のウェブサイトはプロキシの使用を検出し、アクセスをブロックする場合があります
- 非常に大きなウェブサイトや複雑なウェブサイトは、メモリ制限により正しく表示されない場合があります

### サーバーがクラッシュする場合

サーバーがクラッシュする場合は、以下の対処法を試してください：

1. Node.jsのメモリ制限を増やす
   - Windowsの場合: `start-proxy-with-more-memory.bat` を実行
   - Mac/Linuxの場合: `./start-proxy-with-more-memory.sh` を実行

2. サーバーを再起動する
   - 定期的にサーバーを再起動することで、メモリリークの影響を軽減できます

## ライセンス

MIT