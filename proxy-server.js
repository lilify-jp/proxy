const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

// ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname)));

// メインページの提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Proxy.html'));
});

// プロキシリクエストを処理するエンドポイント
app.post('/proxy', async (req, res) => {
  const { url, method = 'GET', headers = {}, data = null } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URLが必要です' });
  }

  try {
    // リクエストの設定
    const config = {
      method: method,
      url: url,
      headers: headers,
      ...(data && { data: data }),
      responseType: 'arraybuffer', // バイナリデータも処理できるように
    };

    // リクエストの実行
    const response = await axios(config);
    
    // レスポンスヘッダーの設定
    Object.keys(response.headers).forEach(key => {
      res.setHeader(key, response.headers[key]);
    });

    // コンテンツタイプの確認
    const contentType = response.headers['content-type'] || '';
    
    // レスポンスの送信
    if (contentType.includes('application/json')) {
      const jsonData = JSON.parse(response.data.toString('utf8'));
      res.json(jsonData);
    } else if (contentType.includes('text/')) {
      res.send(response.data.toString('utf8'));
    } else {
      // バイナリデータの場合
      res.send(response.data);
    }
  } catch (error) {
    console.error('プロキシエラー:', error.message);
    
    // エラーレスポンスの送信
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data?.toString('utf8') || '詳細情報なし'
    });
  }
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`プロキシサーバーが http://localhost:${PORT} で起動しました`);
});