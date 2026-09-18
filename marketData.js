/**
 * NexusCrypto AI - Market Data Service
 * Live feeds for Binance Ticker & Klines, Alternative.me Fear & Greed, and CoinTelegraph News.
 */

const FALLBACK_TICKERS = {
  BTCUSDT: { symbol: 'BTCUSDT', lastPrice: '77240.50', priceChangePercent: '+2.45', highPrice: '78100.00', lowPrice: '75400.00', volume: '14230.5' },
  ETHUSDT: { symbol: 'ETHUSDT', lastPrice: '2680.15', priceChangePercent: '+1.82', highPrice: '2720.00', lowPrice: '2610.00', volume: '89420.1' },
  SOLUSDT: { symbol: 'SOLUSDT', lastPrice: '194.75', priceChangePercent: '+5.10', highPrice: '199.50', lowPrice: '183.20', volume: '245600.0' },
  BNBUSDT: { symbol: 'BNBUSDT', lastPrice: '620.40', priceChangePercent: '-0.35', highPrice: '632.00', lowPrice: '615.00', volume: '34210.0' },
  XRPUSDT: { symbol: 'XRPUSDT', lastPrice: '0.6120', priceChangePercent: '+3.15', highPrice: '0.6250', lowPrice: '0.5890', volume: '984500.0' },
  ADAUSDT: { symbol: 'ADAUSDT', lastPrice: '0.4180', priceChangePercent: '+0.95', highPrice: '0.4280', lowPrice: '0.4050', volume: '512000.0' },
  DOGEUSDT: { symbol: 'DOGEUSDT', lastPrice: '0.1425', priceChangePercent: '+4.20', highPrice: '0.1480', lowPrice: '0.1340', volume: '1450000.0' },
  AVAXUSDT: { symbol: 'AVAXUSDT', lastPrice: '31.85', priceChangePercent: '+2.90', highPrice: '32.90', lowPrice: '30.40', volume: '88400.0' }
};

export class MarketDataService {
  constructor() {
    this.tickerCache = {};
    this.fngCache = null;
    this.newsCache = [];
    this.lastFngFetch = 0;
    this.lastNewsFetch = 0;
  }

  /**
   * Fetch 24hr ticker data for a single symbol (e.g. BTCUSDT)
   */
  async getTicker(symbol = 'BTCUSDT') {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
      const data = await res.json();
      const ticker = {
        symbol: data.symbol,
        lastPrice: parseFloat(data.lastPrice).toFixed(symbol.includes('DOGE') || symbol.includes('XRP') || symbol.includes('ADA') ? 4 : 2),
        priceChangePercent: (parseFloat(data.priceChangePercent) >= 0 ? '+' : '') + parseFloat(data.priceChangePercent).toFixed(2),
        highPrice: parseFloat(data.highPrice).toFixed(2),
        lowPrice: parseFloat(data.lowPrice).toFixed(2),
        volume: parseFloat(data.volume).toFixed(1),
        raw: data
      };
      this.tickerCache[symbol] = ticker;
      return ticker;
    } catch (err) {
      console.warn(`[MarketData] Failed to fetch ticker for ${symbol}, using cache/fallback:`, err);
      return this.tickerCache[symbol] || FALLBACK_TICKERS[symbol] || {
        symbol,
        lastPrice: '0.00',
        priceChangePercent: '+0.00',
        highPrice: '0.00',
        lowPrice: '0.00',
        volume: '0'
      };
    }
  }

  /**
   * Fetch multiple tickers for the top marquee bar
   */
  async getTopTickers() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'];
    const results = await Promise.all(symbols.map(s => this.getTicker(s)));
    return results;
  }

  /**
   * Fetch candlestick klines for technical indicator calculations
   * @param {string} symbol - e.g. BTCUSDT
   * @param {string} interval - e.g. '1h' or '4h'
   * @param {number} limit - number of candles (default 30)
   */
  async getKlines(symbol = 'BTCUSDT', interval = '1h', limit = 30) {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}`);
      const data = await res.json();
      // Format: [openTime, open, high, low, close, volume, ...]
      return data.map(candle => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (err) {
      console.warn(`[MarketData] Failed to fetch klines for ${symbol}, generating synthetic klines:`, err);
      return this.generateSyntheticKlines(symbol, limit);
    }
  }

  /**
   * Fetch Fear and Greed index from alternative.me
   */
  async getFearAndGreed() {
    const now = Date.now();
    if (this.fngCache && now - this.lastFngFetch < 300000) { // 5-min cache
      return this.fngCache;
    }

    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=1');
      if (!res.ok) throw new Error(`F&G HTTP ${res.status}`);
      const json = await res.json();
      const item = json.data[0];
      this.fngCache = {
        value: parseInt(item.value, 10),
        classification: item.value_classification,
        timestamp: item.timestamp
      };
      this.lastFngFetch = now;
      return this.fngCache;
    } catch (err) {
      console.warn('[MarketData] Failed to fetch Fear & Greed, using fallback:', err);
      return this.fngCache || {
        value: 62,
        classification: 'Greed',
        timestamp: Math.floor(Date.now() / 1000)
      };
    }
  }

  /**
   * Fetch live crypto news from CoinTelegraph via rss2json
   */
  async getLatestNews() {
    const now = Date.now();
    if (this.newsCache.length > 0 && now - this.lastNewsFetch < 180000) { // 3-min cache
      return this.newsCache;
    }

    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss');
      if (!res.ok) throw new Error(`News HTTP ${res.status}`);
      const json = await res.json();
      if (json.items && Array.isArray(json.items)) {
        this.newsCache = json.items.slice(0, 8).map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          categories: item.categories || [],
          sentiment: this.estimateNewsSentiment(item.title)
        }));
        this.lastNewsFetch = now;
        return this.newsCache;
      }
      throw new Error('Invalid news payload');
    } catch (err) {
      console.warn('[MarketData] Failed to fetch live news, using fallback:', err);
      return this.newsCache.length > 0 ? this.newsCache : [
        {
          title: 'Bitcoin Market Resilience Holds Above Key Support as Institutional Inflows Continue',
          link: 'https://cointelegraph.com',
          pubDate: new Date().toLocaleTimeString(),
          categories: ['Bitcoin', 'Markets'],
          sentiment: 'BULLISH'
        },
        {
          title: 'Ethereum Layer-2 Networks Hit All-Time High in Daily Active Transactions',
          link: 'https://cointelegraph.com',
          pubDate: new Date().toLocaleTimeString(),
          categories: ['Ethereum', 'DeFi'],
          sentiment: 'BULLISH'
        },
        {
          title: 'SEC Reviews Multi-Asset Crypto Index ETF Proposals Ahead of Q4 Deadlines',
          link: 'https://cointelegraph.com',
          pubDate: new Date().toLocaleTimeString(),
          categories: ['Regulation', 'ETF'],
          sentiment: 'NEUTRAL'
        },
        {
          title: 'Solana DeFi Volume Surges as New Liquid Staking Protocols Gain Traction',
          link: 'https://cointelegraph.com',
          pubDate: new Date().toLocaleTimeString(),
          categories: ['Solana', 'DeFi'],
          sentiment: 'BULLISH'
        }
      ];
    }
  }

  /**
   * Helper to gauge sentiment tag from headline
   */
  estimateNewsSentiment(title = '') {
    const lower = title.toLowerCase();
    const bullishKeywords = ['surge', 'soar', 'record', 'inflows', 'etf', 'approval', 'adoption', 'gain', 'rally', 'bull', 'high'];
    const bearishKeywords = ['plunge', 'drop', 'ban', 'lawsuit', 'hack', 'outflow', 'dump', 'scam', 'crash', 'bear', 'warning'];

    const bullMatches = bullishKeywords.filter(k => lower.includes(k)).length;
    const bearMatches = bearishKeywords.filter(k => lower.includes(k)).length;

    if (bullMatches > bearMatches) return 'BULLISH';
    if (bearMatches > bullMatches) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Generates realistic synthetic candles if offline or network error
   */
  generateSyntheticKlines(symbol, limit = 30) {
    const basePrices = {
      BTCUSDT: 77000,
      ETHUSDT: 2650,
      SOLUSDT: 190,
      BNBUSDT: 620,
      XRPUSDT: 0.60,
      ADAUSDT: 0.42,
      DOGEUSDT: 0.14,
      AVAXUSDT: 32
    };

    let price = basePrices[symbol] || 100;
    const candles = [];
    const now = Date.now();
    const step = 3600 * 1000;

    for (let i = limit; i >= 0; i--) {
      const change = (Math.random() - 0.48) * (price * 0.015);
      const open = price;
      price = Math.max(price + change, price * 0.5);
      const close = price;
      const high = Math.max(open, close) + Math.random() * (price * 0.008);
      const low = Math.min(open, close) - Math.random() * (price * 0.008);
      const volume = Math.floor(Math.random() * 1000 + 100);

      candles.push({
        time: now - i * step,
        open,
        high,
        low,
        close,
        volume
      });
    }
    return candles;
  }
}
