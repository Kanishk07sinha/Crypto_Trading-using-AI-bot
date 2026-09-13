/**
 * NexusCrypto AI - Main Application Controller
 */

import { GuardrailEngine, CRYPTO_COINS } from './guardrail.js';
import { MarketDataService } from './marketData.js';
import { TradingEngine } from './tradingEngine.js';
import { ChartEngine } from './chart.js';

class CryptoChatApp {
  constructor() {
    this.marketService = new MarketDataService();
    this.chartEngine = null;

    this.activeCoin = CRYPTO_COINS.btc;
    this.klines = [];
    this.news = [];
    this.fng = null;
    this.tickers = [];
    this.activeTimeframe = '60'; // 1, 5, 15, 60, 240, D
    this.workspaceMode = 'chat'; // 'chat', 'split', 'graph'
    this.currentAnalysis = null;

    this.soundEnabled = true;
    this.riskProfile = 'balanced';
    this.apiKey = localStorage.getItem('nexus_api_key') || '';
    this.apiProvider = localStorage.getItem('nexus_provider') || 'local'; // 'local', 'gemini', 'openai'

    this.audioCtx = null;
    this.initElements();
    this.initEvents();
    this.initAudio();
    this.startDataFeeds();
  }

  initElements() {
    this.appBody = document.getElementById('appBody');
    this.chatMessages = document.getElementById('chatMessages');
    this.userInput = document.getElementById('userInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.tickerTrack = document.getElementById('tickerTrack');
    this.fngValueEl = document.getElementById('fngValue');
    this.fngLabelEl = document.getElementById('fngLabel');
    this.fngFillEl = document.getElementById('fngFill');
    this.newsListEl = document.getElementById('newsList');
    this.activeCoinNameEl = document.getElementById('activeCoinName');
    this.activeCoinPriceEl = document.getElementById('activeCoinPrice');
    this.activeCoinChangeEl = document.getElementById('activeCoinChange');
    this.coinPills = document.querySelectorAll('.coin-pill');
    this.chartEngine = new ChartEngine('priceChart');

    // Live Trading Graph elements
    this.modeChatBtn = document.getElementById('modeChatBtn');
    this.modeSplitBtn = document.getElementById('modeSplitBtn');
    this.modeGraphBtn = document.getElementById('modeGraphBtn');
    this.quickSplitBtn = document.getElementById('quickSplitBtn');
    this.openLiveGraphChip = document.getElementById('openLiveGraphChip');
    this.expandToLiveGraphBtn = document.getElementById('expandToLiveGraphBtn');
    this.tradingViewIframe = document.getElementById('tradingViewIframe');
    this.tvContainer = document.getElementById('tvContainer');
    this.aiChartContainer = document.getElementById('aiChartContainer');
    this.engineTvBtn = document.getElementById('engineTvBtn');
    this.engineAiBtn = document.getElementById('engineAiBtn');
    this.graphCoinSymbol = document.getElementById('graphCoinSymbol');
    this.graphCoinName = document.getElementById('graphCoinName');
    this.graphLastPrice = document.getElementById('graphLastPrice');
    this.graphPriceChange = document.getElementById('graphPriceChange');
    this.graph24High = document.getElementById('graph24High');
    this.graph24Low = document.getElementById('graph24Low');
    this.graph24Vol = document.getElementById('graph24Vol');
    this.graphAiVerdict = document.getElementById('graphAiVerdict');
    this.graphAiReason = document.getElementById('graphAiReason');
    this.calcCapital = document.getElementById('calcCapital');
    this.calcTp1 = document.getElementById('calcTp1');
    this.calcTp2 = document.getElementById('calcTp2');
    this.calcSl = document.getElementById('calcSl');
    this.calcPosSize = document.getElementById('calcPosSize');
    this.tfBtns = document.querySelectorAll('.tf-btn');
    this.expandedAiChartEngine = new ChartEngine('expandedAiCanvas');
  }

  initEvents() {
    // Workspace Mode Switching
    if (this.modeChatBtn) this.modeChatBtn.addEventListener('click', () => this.setWorkspaceMode('chat'));
    if (this.modeSplitBtn) this.modeSplitBtn.addEventListener('click', () => this.setWorkspaceMode('split'));
    if (this.modeGraphBtn) this.modeGraphBtn.addEventListener('click', () => this.setWorkspaceMode('graph'));
    if (this.quickSplitBtn) this.quickSplitBtn.addEventListener('click', () => this.setWorkspaceMode(this.workspaceMode === 'split' ? 'chat' : 'split'));
    if (this.openLiveGraphChip) this.openLiveGraphChip.addEventListener('click', () => this.setWorkspaceMode('split'));
    if (this.expandToLiveGraphBtn) this.expandToLiveGraphBtn.addEventListener('click', () => this.setWorkspaceMode('graph'));

    // Timeframe selector buttons
    this.tfBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.tfBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTimeframe = btn.dataset.tf;
        this.updateTradingViewIframe();
      });
    });

    // Graph Engine toggle (TradingView vs AI Overlay)
    if (this.engineTvBtn && this.engineAiBtn) {
      this.engineTvBtn.addEventListener('click', () => {
        this.engineTvBtn.classList.add('active');
        this.engineAiBtn.classList.remove('active');
        if (this.tvContainer) this.tvContainer.classList.add('active');
        if (this.aiChartContainer) this.aiChartContainer.classList.remove('active');
      });
      this.engineAiBtn.addEventListener('click', () => {
        this.engineAiBtn.classList.add('active');
        this.engineTvBtn.classList.remove('active');
        if (this.aiChartContainer) this.aiChartContainer.classList.add('active');
        if (this.tvContainer) this.tvContainer.classList.remove('active');
        if (this.expandedAiChartEngine) {
          this.expandedAiChartEngine.resizeCanvas();
          this.expandedAiChartEngine.draw();
        }
      });
    }

    // Capital calculator input
    if (this.calcCapital) {
      this.calcCapital.addEventListener('input', () => this.updateCalculator());
    }

    // Click "View on Live Graph" inside any chat investment card
    document.addEventListener('click', (e) => {
      const graphBtn = e.target.closest('.view-live-graph-btn');
      if (graphBtn) {
        const symbol = graphBtn.dataset.symbol.toLowerCase();
        if (CRYPTO_COINS[symbol]) {
          this.switchActiveCoin(CRYPTO_COINS[symbol]);
          this.setWorkspaceMode('split');
          this.playBeep('msg');
        }
      }
    });

    // Send message on click or Enter
    this.sendBtn.addEventListener('click', () => this.handleUserMessage());
    this.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleUserMessage();
      }
    });

    // Coin selector pills
    this.coinPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const symbol = pill.dataset.symbol.toLowerCase();
        if (CRYPTO_COINS[symbol]) {
          this.switchActiveCoin(CRYPTO_COINS[symbol]);
        }
      });
    });

    // Chart mode toggle
    const chartModeCandles = document.getElementById('modeCandles');
    const chartModeLine = document.getElementById('modeLine');
    if (chartModeCandles && chartModeLine) {
      chartModeCandles.addEventListener('click', () => {
        chartModeCandles.classList.add('active');
        chartModeLine.classList.remove('active');
        this.chartEngine.chartMode = 'candles';
        this.chartEngine.draw();
      });
      chartModeLine.addEventListener('click', () => {
        chartModeLine.classList.add('active');
        chartModeCandles.classList.remove('active');
        this.chartEngine.chartMode = 'line';
        this.chartEngine.draw();
      });
    }

    // Quick suggestion chips
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip:not(#openLiveGraphChip), .prompt-suggestion-btn');
      if (chip) {
        const prompt = chip.dataset.prompt || chip.innerText.replace(/^[⚡📊📰🔮🧭]\s*"/, '').replace(/"$/, '');
        this.userInput.value = prompt;
        this.handleUserMessage();
      }
    });

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    const soundToggle = document.getElementById('soundToggle');
    const providerSelect = document.getElementById('providerSelect');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const riskSelect = document.getElementById('riskSelect');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        if (providerSelect) providerSelect.value = this.apiProvider;
        if (apiKeyInput) apiKeyInput.value = this.apiKey;
        if (riskSelect) riskSelect.value = this.riskProfile;
        if (soundToggle) soundToggle.checked = this.soundEnabled;
        settingsModal.classList.add('open');
      });

      closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('open');
      });

      saveSettings.addEventListener('click', () => {
        this.apiProvider = providerSelect.value;
        this.apiKey = apiKeyInput.value.trim();
        this.riskProfile = riskSelect.value;
        this.soundEnabled = soundToggle.checked;

        localStorage.setItem('nexus_provider', this.apiProvider);
        localStorage.setItem('nexus_api_key', this.apiKey);

        settingsModal.classList.remove('open');
        this.appendSystemNotice(`⚙️ Settings saved. Operating in <strong>${this.apiProvider.toUpperCase()}</strong> mode with <strong>${this.riskProfile.toUpperCase()}</strong> risk profiling.`);
      });
    }
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  playBeep(type = 'msg') {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;
      if (type === 'invest') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'alert') {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        osc.frequency.setValueAtTime(659.25, now); // E5
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (e) {}
  }

  async startDataFeeds() {
    await this.refreshTickers();
    await this.refreshFearAndGreed();
    await this.refreshNews();
    await this.switchActiveCoin(this.activeCoin);

    // Initial greeting
    this.appendBotGreeting();

    // Auto-refresh loops
    setInterval(() => this.refreshTickers(), 10000); // 10s ticker update
    setInterval(() => this.refreshNews(), 120000); // 2m news update
  }

  async refreshTickers() {
    this.tickers = await this.marketService.getTopTickers();
    this.renderTickerMarquee();
    this.updateActiveCoinDisplay();
  }

  renderTickerMarquee() {
    if (!this.tickerTrack || !this.tickers.length) return;
    const items = this.tickers.map(t => {
      const isPos = !t.priceChangePercent.startsWith('-');
      return `
        <div class="ticker-item" data-symbol="${t.symbol}">
          <span class="t-sym">${t.symbol.replace('USDT', '')}</span>
          <span class="t-price">$${parseFloat(t.lastPrice).toLocaleString()}</span>
          <span class="t-chg ${isPos ? 'bull-green' : 'bear-red'}">${t.priceChangePercent}%</span>
        </div>
      `;
    }).join('');

    // Duplicate for infinite seamless scroll
    this.tickerTrack.innerHTML = items + items;
  }

  async refreshFearAndGreed() {
    this.fng = await this.marketService.getFearAndGreed();
    if (this.fng && this.fngValueEl) {
      this.fngValueEl.innerText = this.fng.value;
      this.fngLabelEl.innerText = this.fng.classification.toUpperCase();
      this.fngFillEl.style.width = `${this.fng.value}%`;

      if (this.fng.value < 30) {
        this.fngFillEl.style.background = 'linear-gradient(90deg, #ef4444, #f59e0b)';
      } else if (this.fng.value > 70) {
        this.fngFillEl.style.background = 'linear-gradient(90deg, #10b981, #00ff9d)';
      } else {
        this.fngFillEl.style.background = 'linear-gradient(90deg, #00e5ff, #3b82f6)';
      }
    }
  }

  async refreshNews() {
    this.news = await this.marketService.getLatestNews();
    if (!this.newsListEl) return;

    if (this.news.length === 0) {
      this.newsListEl.innerHTML = '<div class="news-empty">Fetching latest news...</div>';
      return;
    }

    this.newsListEl.innerHTML = this.news.slice(0, 5).map(n => `
      <a href="${n.link}" target="_blank" rel="noopener noreferrer" class="news-card">
        <div class="news-top">
          <span class="news-sentiment ${n.sentiment === 'BULLISH' ? 'tag-bull' : n.sentiment === 'BEARISH' ? 'tag-bear' : 'tag-neutral'}">${n.sentiment}</span>
          <span class="news-time">${n.pubDate.split(' ')[1] || 'Today'}</span>
        </div>
        <div class="news-title">${n.title}</div>
      </a>
    `).join('');
  }

  async switchActiveCoin(coin) {
    this.activeCoin = coin;

    // Highlight active pill
    this.coinPills.forEach(p => {
      p.classList.toggle('active', p.dataset.symbol.toUpperCase() === coin.symbol);
    });

    // Fetch klines for chart & indicators
    this.klines = await this.marketService.getKlines(coin.binance, '1h', 32);
    this.chartEngine.updateData(this.klines, coin.symbol);
    this.updateActiveCoinDisplay();
    this.updateLiveTradingGraph();
  }

  setWorkspaceMode(mode) {
    this.workspaceMode = mode;
    if (this.appBody) {
      this.appBody.className = `app-body mode-${mode}`;
    }

    if (this.modeChatBtn) this.modeChatBtn.classList.toggle('active', mode === 'chat');
    if (this.modeSplitBtn) this.modeSplitBtn.classList.toggle('active', mode === 'split');
    if (this.modeGraphBtn) this.modeGraphBtn.classList.toggle('active', mode === 'graph');

    if (mode === 'split' || mode === 'graph') {
      this.updateLiveTradingGraph();
      setTimeout(() => {
        if (this.expandedAiChartEngine) {
          this.expandedAiChartEngine.resizeCanvas();
          this.expandedAiChartEngine.draw();
        }
      }, 150);
    }
  }

  updateTradingViewIframe() {
    if (!this.tradingViewIframe) return;
    const symbol = this.activeCoin.symbol;
    const interval = this.activeTimeframe || '60';
    const tvUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE%3A${symbol}USDT&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0c101c&studies=RSI%40tv-basicstudies&theme=dark&style=1&timezone=Etc%2FUTC&locale=en`;
    this.tradingViewIframe.src = tvUrl;
  }

  async updateLiveTradingGraph() {
    const symbol = this.activeCoin.symbol;
    const ticker = this.marketService.tickerCache[this.activeCoin.binance] || {
      lastPrice: '---',
      priceChangePercent: '+0.00',
      highPrice: '---',
      lowPrice: '---',
      volume: '---'
    };

    if (this.graphCoinSymbol) this.graphCoinSymbol.innerText = symbol;
    if (this.graphCoinName) this.graphCoinName.innerText = `${this.activeCoin.name} / USDT`;
    if (this.graphLastPrice) this.graphLastPrice.innerText = `$${parseFloat(ticker.lastPrice).toLocaleString()}`;
    if (this.graphPriceChange) {
      const isPos = !ticker.priceChangePercent.startsWith('-');
      this.graphPriceChange.innerText = `${isPos ? '▲' : '▼'} ${ticker.priceChangePercent}%`;
      this.graphPriceChange.className = `graph-change ${isPos ? 'bull-green' : 'bear-red'}`;
    }
    if (this.graph24High) this.graph24High.innerText = `$${parseFloat(ticker.highPrice).toLocaleString()}`;
    if (this.graph24Low) this.graph24Low.innerText = `$${parseFloat(ticker.lowPrice).toLocaleString()}`;
    if (this.graph24Vol) this.graph24Vol.innerText = `${parseFloat(ticker.volume).toLocaleString()} ${symbol}`;

    // Update TradingView iframe URL
    this.updateTradingViewIframe();

    // Run trade analysis to obtain exact setup levels for this coin
    const analysis = TradingEngine.analyzeInvestmentOpportunity({
      coin: this.activeCoin,
      ticker,
      klines: this.klines,
      fearAndGreed: this.fng,
      news: this.news,
      riskProfile: this.riskProfile
    });

    this.currentAnalysis = analysis;

    // Update verdict & reasoning on Live Graph bottom bar
    if (this.graphAiVerdict) {
      const isInvest = analysis.confluenceScore >= 60;
      this.graphAiVerdict.innerHTML = `${isInvest ? '🟢' : analysis.confluenceScore >= 45 ? '🟡' : '🔴'} ${analysis.verdict}`;
      this.graphAiVerdict.className = `desk-verdict-title ${isInvest ? 'text-green' : analysis.confluenceScore >= 45 ? 'text-amber' : 'text-red'}`;
    }
    if (this.graphAiReason) {
      this.graphAiReason.innerText = analysis.actionRecommendation;
    }

    // Update Expanded AI Overlay Canvas with Target Levels
    if (this.expandedAiChartEngine && this.klines.length > 0) {
      const entryLow = parseFloat((analysis.currentPrice * 0.985).toFixed(symbol === 'DOGE' || symbol === 'XRP' ? 4 : 2));
      const entryHigh = parseFloat((analysis.currentPrice * 1.005).toFixed(symbol === 'DOGE' || symbol === 'XRP' ? 4 : 2));
      const takeProfit1 = parseFloat((analysis.currentPrice * 1.045).toFixed(symbol === 'DOGE' || symbol === 'XRP' ? 4 : 2));
      const takeProfit2 = parseFloat((analysis.currentPrice * 1.095).toFixed(symbol === 'DOGE' || symbol === 'XRP' ? 4 : 2));
      const stopLoss = parseFloat((analysis.currentPrice * 0.96).toFixed(symbol === 'DOGE' || symbol === 'XRP' ? 4 : 2));

      this.expandedAiChartEngine.updateData(this.klines, symbol, 'candles', {
        entryLow,
        entryHigh,
        takeProfit1,
        takeProfit2,
        stopLoss
      });
    }

    // Update Capital & Position Sizing Calculator
    this.updateCalculator();
  }

  updateCalculator() {
    if (!this.calcCapital) return;
    const capital = parseFloat(this.calcCapital.value) || 1000;
    const price = parseFloat(this.marketService.tickerCache[this.activeCoin.binance]?.lastPrice) || 1;

    const posSize = (capital / price).toFixed(price > 100 ? 4 : 2);
    const tp1Profit = (capital * 0.045).toFixed(2);
    const tp2Profit = (capital * 0.095).toFixed(2);
    const slLoss = (capital * 0.038).toFixed(2);

    if (this.calcPosSize) this.calcPosSize.innerText = `${posSize} ${this.activeCoin.symbol}`;
    if (this.calcTp1) this.calcTp1.innerText = `+$${tp1Profit} (+4.5%)`;
    if (this.calcTp2) this.calcTp2.innerText = `+$${tp2Profit} (+9.5%)`;
    if (this.calcSl) this.calcSl.innerText = `-$${slLoss} (-3.8%)`;
  }

  updateActiveCoinDisplay() {
    const ticker = this.marketService.tickerCache[this.activeCoin.binance] || {
      lastPrice: '---',
      priceChangePercent: '+0.00'
    };

    if (this.activeCoinNameEl) this.activeCoinNameEl.innerText = `${this.activeCoin.name} (${this.activeCoin.symbol})`;
    if (this.activeCoinPriceEl) this.activeCoinPriceEl.innerText = `$${parseFloat(ticker.lastPrice).toLocaleString()}`;
    if (this.activeCoinChangeEl) {
      const isPos = !ticker.priceChangePercent.startsWith('-');
      this.activeCoinChangeEl.innerText = `${isPos ? '▲' : '▼'} ${ticker.priceChangePercent}%`;
      this.activeCoinChangeEl.className = `active-coin-change ${isPos ? 'bull-green' : 'bear-red'}`;
    }
  }

  appendBotGreeting() {
    const greetingHtml = `
      <div class="bot-welcome-card">
        <h3>🚀 Welcome to NexusCrypto AI</h3>
        <p>Your dedicated autonomous <strong>Crypto Trading & Market Intelligence Sentinel</strong>. I monitor real-time Binance order books, 14-period RSI, moving averages, and breaking news to give you actionable <strong>Invest / Do Not Invest</strong> setups with strict capital protection.</p>
        
        <div class="guardrail-badge">
          🛡️ <strong>Sentinel Protocol Enforced:</strong> Strictly configured to cryptocurrency, tokenomics, technical charts, and crypto news.
        </div>

        <div class="quick-prompts-label">Try asking:</div>
        <div class="quick-prompts-grid">
          <button class="prompt-suggestion-btn">⚡ Should I invest in Bitcoin (BTC) right now?</button>
          <button class="prompt-suggestion-btn">📊 Analyze Ethereum (ETH) technicals & RSI</button>
          <button class="prompt-suggestion-btn">📰 What is the latest breaking crypto news?</button>
          <button class="prompt-suggestion-btn">🔮 Is Solana (SOL) a good buy or should I wait?</button>
        </div>
      </div>
    `;
    this.appendMessage('bot', greetingHtml, true);
  }

  async handleUserMessage() {
    const query = this.userInput.value.trim();
    if (!query) return;

    this.userInput.value = '';
    this.appendMessage('user', query);
    this.playBeep('msg');

    // 1. Evaluate Guardrail
    const guardrailResult = GuardrailEngine.evaluate(query);

    if (!guardrailResult.isAllowed) {
      this.playBeep('alert');
      this.renderGuardrailRefusal(guardrailResult.message);
      return;
    }

    // Show loading indicator
    const loadingId = this.showLoadingIndicator();

    try {
      // 2. Identify coin or use active coin
      const coin = guardrailResult.detectedCoin || this.activeCoin;
      if (coin.symbol !== this.activeCoin.symbol) {
        await this.switchActiveCoin(coin);
      }

      // 3. Process Intent
      let responseHtml = '';
      if (guardrailResult.intent === 'greeting') {
        responseHtml = `
          <p>Hello! I am online and analyzing live market depth. Ask me about any coin's investment timing, e.g., <em>"Should I invest in ${this.activeCoin.name} today?"</em> or <em>"Show me the latest crypto news"</em>.</p>
        `;
      } else if (guardrailResult.intent === 'news_query') {
        const newsItems = await this.marketService.getLatestNews();
        responseHtml = this.formatNewsResponse(newsItems, coin);
      } else if (guardrailResult.intent === 'sentiment_check') {
        responseHtml = this.formatSentimentResponse();
      } else if (guardrailResult.intent === 'price_check') {
        const ticker = await this.marketService.getTicker(coin.binance);
        responseHtml = this.formatPriceResponse(coin, ticker);
      } else {
        // Default or invest_timing or technical_analysis
        // Run full Trading Engine
        const ticker = await this.marketService.getTicker(coin.binance);
        const klines = await this.marketService.getKlines(coin.binance, '1h', 30);
        const fng = await this.marketService.getFearAndGreed();
        const news = await this.marketService.getLatestNews();

        const analysis = TradingEngine.analyzeInvestmentOpportunity({
          coin,
          ticker,
          klines,
          fearAndGreed: fng,
          news,
          riskProfile: this.riskProfile
        });

        responseHtml = TradingEngine.formatInvestmentCard(analysis);
        this.playBeep(analysis.confluenceScore >= 60 ? 'invest' : 'alert');
      }

      this.removeLoadingIndicator(loadingId);
      this.appendMessage('bot', responseHtml, true);

    } catch (err) {
      console.error(err);
      this.removeLoadingIndicator(loadingId);
      this.appendMessage('bot', `<div class="error-box">⚠️ Network error connecting to market feed. Retrying... Please check connection or ask again.</div>`, true);
    }
  }

  renderGuardrailRefusal(refusal) {
    const html = `
      <div class="guardrail-refusal-card">
        <div class="refusal-header">
          <span class="refusal-shield">🛡️</span>
          <h4>${refusal.title}</h4>
        </div>
        <p class="refusal-reason">${refusal.reason}</p>
        <p class="refusal-guidance">${refusal.guidance}</p>
        <div class="refusal-suggestions">
          ${refusal.suggestions.map(s => `
            <button class="prompt-suggestion-btn">${s}</button>
          `).join('')}
        </div>
      </div>
    `;
    this.appendMessage('bot', html, true);
  }

  formatNewsResponse(news, coin) {
    const matched = news.filter(n => {
      const txt = (n.title + ' ' + (n.categories || []).join(' ')).toLowerCase();
      return txt.includes(coin.symbol.toLowerCase()) || txt.includes(coin.name.toLowerCase());
    });

    const displayNews = matched.length > 0 ? matched : news.slice(0, 4);

    return `
      <div class="news-response-card">
        <div class="nr-header">
          <h4>📰 Latest Breaking Crypto Intelligence</h4>
          <span class="nr-tag">${matched.length > 0 ? coin.name + ' Catalysts' : 'Global Crypto Market'}</span>
        </div>
        <div class="nr-list">
          ${displayNews.map(n => `
            <div class="nr-item">
              <div class="nr-item-top">
                <span class="news-sentiment ${n.sentiment === 'BULLISH' ? 'tag-bull' : n.sentiment === 'BEARISH' ? 'tag-bear' : 'tag-neutral'}">${n.sentiment}</span>
                <span class="nr-time">${n.pubDate}</span>
              </div>
              <a href="${n.link}" target="_blank" rel="noopener noreferrer" class="nr-title">${n.title} ↗</a>
            </div>
          `).join('')}
        </div>
        <p class="nr-tip">💡 News sentiment is automatically factored into our investment confluence signals.</p>
      </div>
    `;
  }

  formatSentimentResponse() {
    const fng = this.fng || { value: 60, classification: 'Greed' };
    return `
      <div class="sentiment-response-card">
        <h4>🧭 Crypto Market Sentiment Diagnostic</h4>
        <div class="fng-large-display">
          <div class="fng-circle">
            <span class="fng-big-num">${fng.value}</span>
            <span class="fng-scale">/ 100</span>
          </div>
          <div class="fng-info">
            <div class="fng-stage">${fng.classification.toUpperCase()}</div>
            <p>
              ${fng.value < 25 ? 'Extreme Fear: Historic contrarian accumulation zone. Retail panic often precedes sharp upside reversals.' :
                fng.value > 75 ? 'Extreme Greed: Overheated speculative excitement. High likelihood of liquidity sweeps or flash corrections.' :
                'Neutral / Moderate Greed: Constructive trend continuation environment without excessive euphoria.'}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  formatPriceResponse(coin, ticker) {
    const isPos = !ticker.priceChangePercent.startsWith('-');
    return `
      <div class="price-response-card">
        <div class="pr-header">
          <strong>${coin.name} (${coin.symbol}) Real-Time Quote</strong>
          <span class="${isPos ? 'bull-green' : 'bear-red'}">${ticker.priceChangePercent}% (24h)</span>
        </div>
        <div class="pr-price">$${parseFloat(ticker.lastPrice).toLocaleString()}</div>
        <div class="pr-stats">
          <div><span>24h High:</span> <strong>$${parseFloat(ticker.highPrice).toLocaleString()}</strong></div>
          <div><span>24h Low:</span> <strong>$${parseFloat(ticker.lowPrice).toLocaleString()}</strong></div>
          <div><span>24h Volume:</span> <strong>${parseFloat(ticker.volume).toLocaleString()} ${coin.symbol}</strong></div>
        </div>
        <div class="pr-actions">
          <button class="prompt-suggestion-btn" data-prompt="Should I invest in ${coin.symbol} right now?">🎯 Get Investment Verdict for ${coin.symbol}</button>
        </div>
      </div>
    `;
  }

  appendMessage(sender, content, isHtml = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    if (isHtml) {
      bubble.innerHTML = content;
    } else {
      bubble.innerText = content;
    }

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.appendChild(timeSpan);
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);

    this.chatMessages.appendChild(msgDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  appendSystemNotice(html) {
    const notice = document.createElement('div');
    notice.className = 'system-notice';
    notice.innerHTML = html;
    this.chatMessages.appendChild(notice);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showLoadingIndicator() {
    const id = 'loader_' + Date.now();
    const loaderDiv = document.createElement('div');
    loaderDiv.id = id;
    loaderDiv.className = 'chat-message bot-message loading-message';
    loaderDiv.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-bubble loading-bubble">
        <div class="pulse-dot"></div>
        <div class="pulse-dot"></div>
        <div class="pulse-dot"></div>
        <span class="loading-text">Analyzing live Binance order books & RSI indicators...</span>
      </div>
    `;
    this.chatMessages.appendChild(loaderDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    return id;
  }

  removeLoadingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
}

// Bootstrap app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.nexusApp = new CryptoChatApp();
});
