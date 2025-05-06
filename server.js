const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');

// アプリケーションの設定
const app = express();
const PORT = process.env.PORT || 3000;

// サーバーの設定
app.set('trust proxy', 1);
app.set('x-powered-by', false); // X-Powered-By ヘッダーを無効化

// ミドルウェアの設定
app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '1mb' })); // JSONボディのサイズ制限
app.use(cors());

// リクエストカウンター
let requestCount = 0;

// サーバーステータスAPI
app.get('/api/status', (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.json({ 
        status: 'online',
        uptime: process.uptime(),
        memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
        },
        requestCount
    });
});

// リクエストキャッシュ
const requestCache = new Map();
// キャッシュの有効期限（ミリ秒）
const CACHE_TTL = 60 * 1000; // 60秒

// エラー回数を追跡
const errorCounter = new Map();
// エラーカウンターのリセット間隔（ミリ秒）
const ERROR_RESET_INTERVAL = 5 * 60 * 1000; // 5分

// 定期的にエラーカウンターをリセット
setInterval(() => {
    errorCounter.clear();
    console.log('Error counter reset');
}, ERROR_RESET_INTERVAL);

// プロキシAPI
app.post('/api/proxy', async (req, res) => {
    try {
        const { url, removeScripts, removeFrames, userAgent, timeout } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URLが必要です' });
        }

        // リクエストカウントを増やす
        requestCount++;
        
        // メモリ使用量をログに記録
        const memoryUsage = process.memoryUsage();
        console.log(`Proxying request #${requestCount} to: ${url}`);
        console.log(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);

        // キャッシュチェック（オプションによってキャッシュキーを変更）
        const cacheKey = `${url}-${removeScripts}-${removeFrames}-${userAgent}`;
        const cachedResponse = requestCache.get(cacheKey);
        
        // エラーカウンターを確認
        const errorCount = errorCounter.get(url) || 0;
        
        // エラーが多いURLの場合はキャッシュを優先的に使用
        if (cachedResponse) {
            const cacheAge = Date.now() - cachedResponse.timestamp;
            const shouldUseCache = errorCount > 0 
                ? cacheAge < CACHE_TTL * 2  // エラーが発生したURLは長めにキャッシュを使用
                : cacheAge < CACHE_TTL;     // 通常のキャッシュ期限
                
            if (shouldUseCache) {
                console.log(`Using cached response for: ${url} (Error count: ${errorCount})`);
                return res.json(cachedResponse.data);
            }
        }

        // リクエストの設定
        const requestOptions = {
            headers: {
                'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                // キャッシュを無効化
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: timeout || 30000,
            validateStatus: function (status) {
                return status >= 200 && status < 500; // 200-499のステータスコードを許可
            },
            // レスポンスタイプを指定
            responseType: 'text',
            // 大きなレスポンスを処理するための設定
            maxContentLength: 10 * 1024 * 1024, // 10MB
            decompress: true,
            // リダイレクトを自動的に処理
            maxRedirects: 10
        };

        // HTTPSリクエストの場合、SSL証明書の検証をスキップするオプション
        if (url.startsWith('https://')) {
            requestOptions.httpsAgent = new https.Agent({
                rejectUnauthorized: false,
                keepAlive: false // 接続を再利用しない
            });
        }

        // リクエストの実行
        let response;
        try {
            // エラーカウントを確認し、エラーが多い場合はタイムアウトを延長
            const currentErrorCount = errorCounter.get(url) || 0;
            if (currentErrorCount > 0) {
                console.log(`URL has previous errors (${currentErrorCount}), extending timeout`);
                requestOptions.timeout = Math.min(requestOptions.timeout * 1.5, 60000); // 最大60秒
            }
            
            response = await axios.get(url, requestOptions);
            
            // 成功した場合、エラーカウンターをリセット
            if (errorCounter.has(url)) {
                errorCounter.delete(url);
                console.log(`Reset error counter for: ${url}`);
            }
        } catch (axiosError) {
            // エラーカウンターを増加
            const currentCount = errorCounter.get(url) || 0;
            errorCounter.set(url, currentCount + 1);
            console.log(`Error counter for ${url}: ${currentCount + 1}`);
            
            // キャッシュされたレスポンスがあれば使用
            const cachedResponse = requestCache.get(cacheKey);
            if (cachedResponse) {
                console.log(`Using cached response after error for: ${url}`);
                return res.json(cachedResponse.data);
            }
            
            // Axiosエラーの詳細なハンドリング
            if (axiosError.response) {
                // サーバーからのレスポンスがあるがエラーステータスの場合
                console.error(`Server responded with error status: ${axiosError.response.status}`);
                return res.status(500).json({ 
                    error: `サーバーエラー: ${axiosError.response.status} ${axiosError.response.statusText || ''}`,
                    details: axiosError.message
                });
            } else if (axiosError.request) {
                // リクエストは送信されたがレスポンスがない場合
                console.error('No response received:', axiosError.message);
                return res.status(500).json({ 
                    error: 'サーバーからの応答がありません',
                    details: axiosError.message
                });
            } else {
                // リクエスト設定中にエラーが発生した場合
                console.error('Request setup error:', axiosError.message);
                return res.status(500).json({ 
                    error: 'リクエスト設定エラー',
                    details: axiosError.message
                });
            }
        }

        // レスポンスのContent-Typeを確認
        const contentType = response.headers['content-type'] || '';

        // HTMLコンテンツの場合
        if (contentType.includes('text/html')) {
            let html = response.data;
            
            try {
                // HTMLが大きすぎる場合は切り詰める
                if (html.length > 10 * 1024 * 1024) { // 10MB以上
                    console.log(`Very large HTML response (${Math.round(html.length / 1024 / 1024)}MB), truncating before parsing...`);
                    html = html.substring(0, 5 * 1024 * 1024) + '\n<!-- Content truncated due to size limitations -->';
                }
                
                // Cheerioを使用してHTMLを解析
                let $ = cheerio.load(html, {
                    decodeEntities: false, // エンティティをデコードしない
                    xmlMode: false,
                    lowerCaseTags: false
                });

                // スクリプトの削除オプション
                if (removeScripts) {
                    $('script').remove();
                    $('[onclick]').removeAttr('onclick');
                    $('[onload]').removeAttr('onload');
                    $('[onerror]').removeAttr('onerror');
                    // その他のJavaScriptイベントハンドラを削除
                    $('[onmouseover]').removeAttr('onmouseover');
                    $('[onmouseout]').removeAttr('onmouseout');
                    $('[onchange]').removeAttr('onchange');
                    $('[onsubmit]').removeAttr('onsubmit');
                    $('[onkeydown]').removeAttr('onkeydown');
                    $('[onkeyup]').removeAttr('onkeyup');
                    $('[onkeypress]').removeAttr('onkeypress');
                }

                // フレームの削除オプション
                if (removeFrames) {
                    $('iframe').remove();
                    $('frame').remove();
                    $('frameset').remove();
                    $('object').remove();
                    $('embed').remove();
                }

                // ベースURLの設定
                if (!$('base').length) {
                    $('head').prepend(`<base href="${url}">`);
                }

                // CSSの相対パスを絶対パスに変換
                $('link[rel="stylesheet"]').each((i, el) => {
                    const href = $(el).attr('href');
                    if (href && !href.startsWith('http') && !href.startsWith('//')) {
                        try {
                            const absoluteUrl = new URL(href, url).href;
                            $(el).attr('href', absoluteUrl);
                        } catch (e) {
                            console.error('Invalid CSS URL:', href);
                        }
                    }
                });

                // 画像の相対パスを絶対パスに変換
                $('img').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
                        try {
                            const absoluteSrc = new URL(src, url).href;
                            $(el).attr('src', absoluteSrc);
                        } catch (e) {
                            console.error('Invalid image URL:', src);
                        }
                    }
                });
                
                // リンクの相対パスを絶対パスに変換
                $('a').each((i, el) => {
                    const href = $(el).attr('href');
                    if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('javascript:')) {
                        try {
                            const absoluteHref = new URL(href, url).href;
                            $(el).attr('href', absoluteHref);
                        } catch (e) {
                            console.error('Invalid link URL:', href);
                        }
                    }
                    
                    // target属性を削除して新しいタブで開かないようにする
                    $(el).removeAttr('target');
                });

                // 修正したHTMLを返す
                html = $.html();
                
                // 大きなHTMLの場合は圧縮または切り詰める
                if (html.length > 5 * 1024 * 1024) { // 5MB以上
                    console.log(`Large HTML response (${Math.round(html.length / 1024 / 1024)}MB), truncating...`);
                    html = html.substring(0, 2 * 1024 * 1024) + '\n<!-- Content truncated due to size limitations -->';
                }
                
                // レスポンスをキャッシュ
                const responseData = { html };
                try {
                    requestCache.set(cacheKey, {
                        data: responseData,
                        timestamp: Date.now()
                    });
                    console.log(`Response cached for: ${url}`);
                } catch (cacheError) {
                    console.error('Error caching response:', cacheError);
                    // キャッシュに問題がある場合、古いキャッシュをクリア
                    requestCache.clear();
                    console.log('Cache cleared due to error');
                }
                
                res.json(responseData);
                
                // メモリを解放
                html = null;
                $ = null;
                
            } catch (cheerioError) {
                console.error('Error parsing HTML with Cheerio:', cheerioError);
                // Cheerioでのパースに失敗した場合、エラーメッセージを返す
                if (!res.headersSent) {
                    const errorHtml = `
                    <html>
                    <head><title>Proxy Result</title></head>
                    <body>
                        <h1>HTML解析エラー</h1>
                        <p>HTMLの解析中にエラーが発生しました。サイトが大きすぎるか、複雑すぎる可能性があります。</p>
                        <p>別のサイトを試すか、オプションを変更してみてください。</p>
                        <p>エラー: ${cheerioError.message}</p>
                    </body>
                    </html>
                    `;
                    
                    res.json({ html: errorHtml });
                }
            }
        } else {
            // HTMLでない場合は、元のURLを返す
            const responseData = { url };
            
            // レスポンスをキャッシュ
            requestCache.set(cacheKey, {
                data: responseData,
                timestamp: Date.now()
            });
            
            res.json(responseData);
        }
        
        // リクエスト完了後にメモリ使用量をログに記録
        const afterMemoryUsage = process.memoryUsage();
        console.log(`After request #${requestCount}: Memory usage: ${Math.round(afterMemoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(afterMemoryUsage.heapTotal / 1024 / 1024)}MB`);
        
        // メモリ使用量が高い場合、ガベージコレクションを促す
        if (afterMemoryUsage.heapUsed > afterMemoryUsage.heapTotal * 0.7) {
            console.log('High memory usage detected, suggesting garbage collection');
            if (global.gc) {
                global.gc();
                console.log('Garbage collection completed');
            }
        }
        
    } catch (error) {
        console.error('Proxy error:', error);
        
        let errorMessage = 'プロキシリクエストに失敗しました';
        let errorDetails = '';
        
        if (error.response) {
            // サーバーからのレスポンスがあるがエラーステータスの場合
            errorMessage = `サーバーエラー: ${error.response.status} ${error.response.statusText || ''}`;
            errorDetails = error.message;
        } else if (error.request) {
            // リクエストは送信されたがレスポンスがない場合
            if (error.code === 'ECONNABORTED') {
                errorMessage = 'リクエストがタイムアウトしました。サイトが大きすぎるか、応答が遅い可能性があります。';
            } else {
                errorMessage = 'サーバーに接続できませんでした';
            }
            errorDetails = error.message;
        } else {
            // リクエスト設定中にエラーが発生した場合
            errorMessage = `エラー: ${error.message}`;
        }
        
        // エラーの詳細をログに記録
        console.error('Detailed error:', error);
        
        // レスポンスヘッダーがまだ送信されていない場合のみレスポンスを送信
        if (!res.headersSent) {
            const errorHtml = `
            <html>
            <head><title>Proxy Error</title></head>
            <body>
                <h1>プロキシエラー</h1>
                <p>${errorMessage}</p>
                ${errorDetails ? `<p>詳細: ${errorDetails}</p>` : ''}
                <p>別のサイトを試すか、オプションを変更してみてください。</p>
                <p>または、サーバーを再起動してみてください。</p>
            </body>
            </html>
            `;
            
            res.json({ html: errorHtml });
        }
    }
    
    // キャッシュのクリーンアップ（古いエントリを削除）
    if (requestCount % 10 === 0) { // 10リクエストごとにクリーンアップ
        const now = Date.now();
        for (const [key, value] of requestCache.entries()) {
            if (now - value.timestamp > CACHE_TTL * 2) {
                requestCache.delete(key);
            }
        }
        console.log(`Cache cleanup: ${requestCache.size} entries remaining`);
    }
});

// メモリ使用量を監視する関数
function monitorMemory() {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    
    console.log(`Memory monitor: ${usedMB}MB / ${totalMB}MB (${Math.round(usageRatio * 100)}%)`);
    
    // メモリ使用率が70%を超えた場合、キャッシュをクリア
    if (usageRatio > 0.7) {
        console.log('High memory usage detected, clearing cache');
        requestCache.clear();
        
        // ガベージコレクションを促す
        if (global.gc) {
            console.log('Running garbage collection');
            global.gc();
        }
    }
}

// 定期的にメモリ使用量を監視
const memoryMonitorInterval = setInterval(monitorMemory, 30000); // 30秒ごと

// サーバーの起動
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`You can also access it via your local network at http://<your-ip-address>:${PORT}`);
    
    // 起動時にメモリ使用量を表示
    monitorMemory();
});

// サーバーのタイムアウト設定
server.timeout = 180000; // 3分
server.keepAliveTimeout = 10000; // 10秒

// サーバーエラーハンドリング
server.on('error', (error) => {
    console.error('Server error:', error);
});

// エラーハンドリング
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    // クリティカルなエラーの場合でもサーバーを継続
    try {
        // キャッシュをクリア
        requestCache.clear();
        errorCounter.clear();
        console.log('Cache and error counters cleared due to uncaught exception');
    } catch (e) {
        console.error('Error during error recovery:', e);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 正常終了時のクリーンアップ
process.on('SIGINT', () => {
    console.log('Server shutting down...');
    clearInterval(memoryMonitorInterval);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});