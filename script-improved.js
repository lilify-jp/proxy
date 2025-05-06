document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const urlInput = document.getElementById('url-input');
    const httpProtocol = document.getElementById('http-protocol');
    const httpsProtocol = document.getElementById('https-protocol');
    const accessBtn = document.getElementById('access-btn');
    const removeScripts = document.getElementById('remove-scripts');
    const removeFrames = document.getElementById('remove-frames');
    const userAgentSelect = document.getElementById('user-agent');
    const customUserAgent = document.getElementById('custom-user-agent');
    const timeout = document.getElementById('timeout');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const checkServerBtn = document.getElementById('check-server-btn');
    const serverInstructions = document.getElementById('server-instructions');
    const loading = document.getElementById('loading');
    const proxyFrame = document.getElementById('proxy-frame');
    const proxyContent = document.getElementById('proxy-content');

    // 保存されたオプション設定を読み込む
    try {
        // スクリプト削除オプション
        const savedRemoveScripts = localStorage.getItem('removeScripts');
        if (savedRemoveScripts !== null) {
            removeScripts.checked = savedRemoveScripts === 'true';
        }
        
        // フレーム削除オプション
        const savedRemoveFrames = localStorage.getItem('removeFrames');
        if (savedRemoveFrames !== null) {
            removeFrames.checked = savedRemoveFrames === 'true';
        }
        
        // User Agent
        const savedUserAgent = localStorage.getItem('userAgent');
        if (savedUserAgent) {
            userAgentSelect.value = savedUserAgent;
            customUserAgent.disabled = savedUserAgent !== 'custom';
        }
        
        // タイムアウト
        const savedTimeout = localStorage.getItem('timeout');
        if (savedTimeout) {
            timeout.value = savedTimeout;
        }
        
        // 最後に使用したURL
        const urlHistory = JSON.parse(localStorage.getItem('urlHistory') || '[]');
        if (urlHistory.length > 0) {
            urlInput.value = urlHistory[0];
        }
        
        console.log('Settings loaded from local storage');
    } catch (e) {
        console.error('Error loading settings:', e);
    }

    // タブ切り替え機能
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // すべてのタブボタンからactiveクラスを削除
            tabBtns.forEach(b => b.classList.remove('active'));
            // クリックされたボタンにactiveクラスを追加
            btn.classList.add('active');
            
            // すべてのタブコンテンツを非表示
            tabContents.forEach(content => content.classList.remove('active'));
            // クリックされたボタンに対応するコンテンツを表示
            const tabId = btn.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });

    // サーバーのステータスを確認
    setServerStatus('offline');
    checkServerStatus();
    
    // サーバー接続確認ボタンのイベント
    checkServerBtn.addEventListener('click', () => {
        checkServerStatus();
    });
    
    // URL履歴ボタンの追加
    const urlHistoryBtn = document.createElement('button');
    urlHistoryBtn.id = 'url-history-btn';
    urlHistoryBtn.title = 'URL履歴';
    urlHistoryBtn.innerHTML = '&#8635;';
    urlHistoryBtn.className = 'history-button';
    urlInput.parentNode.appendChild(urlHistoryBtn);
    
    // URL履歴ボタンのイベント
    urlHistoryBtn.addEventListener('click', () => {
        try {
            const urlHistory = JSON.parse(localStorage.getItem('urlHistory') || '[]');
            if (urlHistory.length === 0) {
                alert('URL履歴がありません');
                return;
            }
            
            const historyList = document.createElement('div');
            historyList.className = 'history-list';
            
            urlHistory.forEach((url, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.textContent = url;
                historyItem.addEventListener('click', () => {
                    urlInput.value = url;
                    document.body.removeChild(historyList);
                });
                historyList.appendChild(historyItem);
            });
            
            // 履歴クリアボタン
            const clearBtn = document.createElement('button');
            clearBtn.className = 'clear-history-btn';
            clearBtn.textContent = '履歴をクリア';
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                localStorage.removeItem('urlHistory');
                document.body.removeChild(historyList);
            });
            historyList.appendChild(clearBtn);
            
            // 閉じるボタン
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-history-btn';
            closeBtn.textContent = '閉じる';
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(historyList);
            });
            historyList.appendChild(closeBtn);
            
            // クリック以外で閉じる
            document.addEventListener('click', function closeHistory(e) {
                if (!historyList.contains(e.target) && e.target !== urlHistoryBtn) {
                    document.body.removeChild(historyList);
                    document.removeEventListener('click', closeHistory);
                }
            });
            
            document.body.appendChild(historyList);
        } catch (e) {
            console.error('Error showing URL history:', e);
        }
    });

    // User Agent選択の変更イベント
    userAgentSelect.addEventListener('change', () => {
        customUserAgent.disabled = userAgentSelect.value !== 'custom';
        if (userAgentSelect.value === 'custom') {
            customUserAgent.focus();
        }
        
        // 設定を保存
        try {
            localStorage.setItem('userAgent', userAgentSelect.value);
        } catch (e) {
            console.error('Error saving user agent setting:', e);
        }
    });

    // アクセスボタンのクリックイベント
    accessBtn.addEventListener('click', accessWebsite);

    // Enterキーでもアクセス
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            accessWebsite();
        }
    });

    // サーバーステータスの確認
    function checkServerStatus() {
        // ステータスチェック中の表示
        statusText.textContent = '確認中...';
        statusIndicator.className = 'status-loading';
        
        fetch('/api/status', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // タイムアウトを設定
            signal: AbortSignal.timeout(3000)
        })
        .then(response => {
            if (response.ok) {
                setServerStatus('online');
                // サーバーがオンラインの場合、サーバー起動手順を非表示
                serverInstructions.style.display = 'none';
                return response.json();
            }
            throw new Error('Server offline');
        })
        .catch(error => {
            console.error('Server status check failed:', error);
            setServerStatus('offline');
            
            // サーバーがオフラインの場合、サーバー起動手順を表示
            serverInstructions.style.display = 'block';
            
            // サーバーがオフラインの場合、エラーメッセージを表示
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = `
                <h3>サーバー接続エラー</h3>
                <p>プロキシサーバーに接続できません。以下を確認してください：</p>
                <ul>
                    <li>サーバーが起動しているか (上記の手順を参照)</li>
                    <li>ブラウザが同じマシンでサーバーにアクセスしているか</li>
                    <li>ポート3000が他のアプリケーションで使用されていないか</li>
                </ul>
                <p>サーバーを起動したら、右上の更新ボタン(&#8635;)をクリックして接続を再確認してください。</p>
            `;
            
            // エラーメッセージを表示
            proxyContent.innerHTML = '';
            proxyContent.appendChild(errorMessage);
            proxyContent.classList.remove('hidden');
            proxyFrame.classList.add('hidden');
            loading.classList.add('hidden');
        });
    }

    // サーバーステータスの設定
    function setServerStatus(status) {
        statusIndicator.className = '';
        
        if (status === 'online') {
            statusIndicator.classList.add('status-online');
            statusText.textContent = 'オンライン';
        } else if (status === 'loading') {
            statusIndicator.classList.add('status-loading');
            statusText.textContent = '処理中...';
        } else {
            statusIndicator.classList.add('status-offline');
            statusText.textContent = 'オフライン';
        }
    }

    // Webサイトへのアクセス
    function accessWebsite() {
        // サーバーがオフラインの場合は警告
        if (statusText.textContent === 'オフライン') {
            const confirmContinue = confirm('サーバーがオフラインのようです。サーバーを起動してから再試行してください。\n\nサーバーを起動するには、stable-proxy.bat をダブルクリックしてください。');
            if (!confirmContinue) return;
        }
        
        // 入力URLの取得と検証
        let url = urlInput.value.trim();
        if (!url) {
            alert('URLを入力してください');
            return;
        }

        // プロトコルの選択
        const protocol = httpProtocol.checked ? 'http://' : 'https://';
        
        // URLにプロトコルが含まれていない場合は追加
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = protocol + url;
        }
        
        // URLをローカルストレージに保存（履歴用）
        try {
            const urlHistory = JSON.parse(localStorage.getItem('urlHistory') || '[]');
            // 同じURLが既に履歴にある場合は削除
            const filteredHistory = urlHistory.filter(item => item !== url);
            // 新しいURLを先頭に追加
            filteredHistory.unshift(url);
            // 履歴は最大10件まで
            if (filteredHistory.length > 10) {
                filteredHistory.pop();
            }
            localStorage.setItem('urlHistory', JSON.stringify(filteredHistory));
        } catch (e) {
            console.error('Error saving URL history:', e);
        }

        // オプションの取得
        const options = {
            url: url,
            removeScripts: removeScripts.checked,
            removeFrames: removeFrames.checked,
            userAgent: getUserAgent(),
            timeout: parseInt(timeout.value) * 1000
        };
        
        // オプション設定をローカルストレージに保存
        try {
            localStorage.setItem('removeScripts', removeScripts.checked);
            localStorage.setItem('removeFrames', removeFrames.checked);
            localStorage.setItem('userAgent', userAgentSelect.value);
            localStorage.setItem('timeout', timeout.value);
        } catch (e) {
            console.error('Error saving options:', e);
        }

        // ローディング表示
        showLoading(true);
        setServerStatus('loading');

        // リクエスト回数を制限するための変数
        let retryCount = 0;
        const maxRetries = 2;

        // プロキシリクエストを送信する関数
        function sendProxyRequest() {
            // タイムアウトを設定（オプションのタイムアウト + 5秒）
            const requestTimeout = options.timeout + 5000;
            
            fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options),
                signal: AbortSignal.timeout(requestTimeout)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // コンテンツの表示
                displayContent(data);
                setServerStatus('online');
            })
            .catch(error => {
                console.error('Proxy request failed:', error);
                
                // エラーメッセージをより詳細に
                let errorMsg = error.message;
                let shouldRetry = false;
                
                if (error.name === 'TypeError' && errorMsg.includes('Failed to fetch')) {
                    errorMsg = 'サーバーに接続できません。サーバーが起動しているか確認してください。\n\nstable-proxy.bat をダブルクリックしてサーバーを起動してください。';
                    shouldRetry = true;
                } else if (error.name === 'AbortError') {
                    errorMsg = 'リクエストがタイムアウトしました。インターネット接続を確認するか、タイムアウト設定を長くしてください。';
                    shouldRetry = true;
                }
                
                // リトライ回数が上限に達していない場合、再試行
                if (shouldRetry && retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retrying request (${retryCount}/${maxRetries})...`);
                    
                    // 再試行前に少し待機
                    setTimeout(() => {
                        sendProxyRequest();
                    }, 1000);
                    
                    return;
                }
                
                // エラーメッセージを表示
                const errorElement = document.createElement('div');
                errorElement.className = 'error-content';
                errorElement.innerHTML = `
                    <h3>エラーが発生しました</h3>
                    <p>${errorMsg}</p>
                    <p>トラブルシューティング:</p>
                    <ul>
                        <li>サーバーが起動していることを確認してください</li>
                        <li>インターネット接続を確認してください</li>
                        <li>URLが正しいことを確認してください</li>
                        <li>別のウェブサイトを試してみてください</li>
                        <li>サーバーを再起動してみてください（restart-server.bat）</li>
                    </ul>
                    <button id="retry-btn" class="retry-button">再試行</button>
                `;
                
                proxyContent.innerHTML = '';
                proxyContent.appendChild(errorElement);
                proxyContent.classList.remove('hidden');
                proxyFrame.classList.add('hidden');
                
                // 再試行ボタンのイベントリスナーを追加
                document.getElementById('retry-btn').addEventListener('click', () => {
                    accessWebsite();
                });
                
                setServerStatus('online');
                
                // エラーが重大な場合はアラートを表示
                if (retryCount >= maxRetries) {
                    alert(`エラー: ${errorMsg}`);
                }
            })
            .finally(() => {
                showLoading(false);
            });
        }
        
        // 最初のリクエストを送信
        sendProxyRequest();
    }

    // User Agentの取得
    function getUserAgent() {
        switch (userAgentSelect.value) {
            case 'mobile':
                return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
            case 'desktop':
                return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
            case 'custom':
                return customUserAgent.value || navigator.userAgent;
            default:
                return navigator.userAgent;
        }
    }

    // ローディング表示の切り替え
    function showLoading(show) {
        if (show) {
            loading.classList.remove('hidden');
            proxyFrame.classList.add('hidden');
            proxyContent.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    // コンテンツの表示
    function displayContent(data) {
        if (data.redirect && data.url) {
            // リダイレクトの処理
            console.log(`Handling redirect to: ${data.url}`);
            urlInput.value = data.url;
            
            // 少し遅延を入れてからリダイレクト先にアクセス
            setTimeout(() => {
                accessWebsite();
            }, 100);
            
            return;
        } else if (data.html) {
            try {
                // HTMLコンテンツの表示
                proxyContent.innerHTML = data.html;
                proxyContent.classList.remove('hidden');
                proxyFrame.classList.add('hidden');
                
                // リンクの処理
                processLinks(proxyContent);
                
                // スクロールを一番上に戻す
                window.scrollTo(0, 0);
            } catch (error) {
                console.error('Error displaying HTML content:', error);
                proxyContent.innerHTML = `
                    <div class="error-content">
                        <h3>表示エラー</h3>
                        <p>コンテンツの表示中にエラーが発生しました。</p>
                        <p>エラー: ${error.message}</p>
                        <p>別のサイトを試すか、オプションを変更してみてください。</p>
                    </div>
                `;
                proxyContent.classList.remove('hidden');
                proxyFrame.classList.add('hidden');
            }
        } else if (data.url) {
            try {
                // iframeでの表示
                proxyFrame.src = data.url;
                proxyFrame.classList.remove('hidden');
                proxyContent.classList.add('hidden');
            } catch (error) {
                console.error('Error displaying iframe content:', error);
                proxyContent.innerHTML = `
                    <div class="error-content">
                        <h3>表示エラー</h3>
                        <p>iframeの表示中にエラーが発生しました。</p>
                        <p>エラー: ${error.message}</p>
                        <p>別のサイトを試すか、オプションを変更してみてください。</p>
                    </div>
                `;
                proxyContent.classList.remove('hidden');
                proxyFrame.classList.add('hidden');
            }
        } else {
            // データがない場合
            proxyContent.innerHTML = `
                <div class="error-content">
                    <h3>データなし</h3>
                    <p>サーバーからデータが返されませんでした。</p>
                    <p>別のサイトを試すか、オプションを変更してみてください。</p>
                </div>
            `;
            proxyContent.classList.remove('hidden');
            proxyFrame.classList.add('hidden');
        }
    }

    // リンクの処理（相対パスを絶対パスに変換など）
    function processLinks(container) {
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // target属性を削除して新しいタブで開かないようにする
            link.removeAttribute('target');
            
            if (href) {
                // すべてのリンクをプロキシを通すように変更
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    let processedUrl;
                    if (href.startsWith('http') || href.startsWith('https')) {
                        // 絶対パスの場合
                        processedUrl = href;
                    } else if (href.startsWith('//')) {
                        // プロトコル相対URLの場合
                        processedUrl = (httpsProtocol.checked ? 'https:' : 'http:') + href;
                    } else if (href.startsWith('#')) {
                        // ページ内リンクの場合は何もしない
                        return;
                    } else {
                        // 相対パスの場合
                        const baseUrl = urlInput.value.trim();
                        try {
                            processedUrl = new URL(href, baseUrl).href;
                        } catch (e) {
                            console.error('Invalid URL:', href, e);
                            return;
                        }
                    }
                    
                    console.log('Processing link:', href, '->', processedUrl);
                    urlInput.value = processedUrl;
                    accessWebsite();
                });
                
                // 元のhrefを保存
                link.setAttribute('data-original-href', href);
                
                // リンクのhref属性を変更して、右クリックで「新しいタブで開く」を選んでも
                // プロキシを通すようにする（ただし、これは完全な解決策ではない）
                link.setAttribute('href', 'javascript:void(0)');
            }
        });
        
        // 画像の相対パスを絶対パスに変換
        const images = container.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                const baseUrl = urlInput.value.trim();
                try {
                    const absoluteSrc = new URL(src, baseUrl).href;
                    img.setAttribute('src', absoluteSrc);
                } catch (e) {
                    console.error('Invalid URL:', src, e);
                }
            }
        });
        
        // フォームのアクションを処理
        const forms = container.querySelectorAll('form');
        forms.forEach(form => {
            const action = form.getAttribute('action');
            
            // フォームのsubmitイベントをキャプチャ
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                let formAction = action;
                if (!formAction) {
                    // actionが指定されていない場合は現在のURLを使用
                    formAction = urlInput.value.trim();
                } else if (!formAction.startsWith('http')) {
                    // 相対パスの場合は絶対パスに変換
                    try {
                        formAction = new URL(formAction, urlInput.value.trim()).href;
                    } catch (err) {
                        console.error('Invalid form action URL:', formAction, err);
                        return;
                    }
                }
                
                // フォームデータの収集
                const formData = new FormData(form);
                const method = (form.getAttribute('method') || 'GET').toUpperCase();
                
                if (method === 'GET') {
                    // GETリクエストの場合はURLにクエリパラメータを追加
                    const url = new URL(formAction);
                    for (const [key, value] of formData.entries()) {
                        url.searchParams.append(key, value);
                    }
                    urlInput.value = url.href;
                    accessWebsite();
                } else {
                    // POSTリクエストの場合はプロキシサーバーを通してPOSTリクエストを送信
                    // 注意: 現在のプロキシサーバーはPOSTリクエストをサポートしていないため、
                    // ここではGETリクエストとして処理します
                    alert('注意: フォームのPOSTリクエストは現在サポートされていません。GETリクエストとして処理します。');
                    const url = new URL(formAction);
                    for (const [key, value] of formData.entries()) {
                        url.searchParams.append(key, value);
                    }
                    urlInput.value = url.href;
                    accessWebsite();
                }
            });
            
            // 元のactionを保存
            if (action) {
                form.setAttribute('data-original-action', action);
            }
            
            // actionを変更してフォームが直接送信されないようにする
            form.setAttribute('action', 'javascript:void(0)');
        });
        
        // base要素を処理（リンクの相対パスの解決に影響する）
        const baseElements = container.querySelectorAll('base');
        baseElements.forEach(baseEl => {
            const href = baseEl.getAttribute('href');
            if (href) {
                try {
                    // base要素のhrefを絶対パスに変換
                    const absoluteBaseUrl = new URL(href, urlInput.value.trim()).href;
                    baseEl.setAttribute('href', absoluteBaseUrl);
                } catch (e) {
                    console.error('Invalid base URL:', href, e);
                }
            }
        });
    }
});