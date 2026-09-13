/**
 * NexusCrypto AI - Domain Guardrail Engine
 * Strictly enforces that the AI chatbot only discusses Cryptocurrencies,
 * Crypto Trading, Blockchain, Tokenomics, Technical Analysis, and Crypto News.
 */

export const CRYPTO_COINS = {
  btc: { symbol: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT' },
  bitcoin: { symbol: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT' },
  eth: { symbol: 'ETH', name: 'Ethereum', binance: 'ETHUSDT' },
  ethereum: { symbol: 'ETH', name: 'Ethereum', binance: 'ETHUSDT' },
  sol: { symbol: 'SOL', name: 'Solana', binance: 'SOLUSDT' },
  solana: { symbol: 'SOL', name: 'Solana', binance: 'SOLUSDT' },
  bnb: { symbol: 'BNB', name: 'BNB', binance: 'BNBUSDT' },
  binancecoin: { symbol: 'BNB', name: 'BNB', binance: 'BNBUSDT' },
  xrp: { symbol: 'XRP', name: 'Ripple', binance: 'XRPUSDT' },
  ripple: { symbol: 'XRP', name: 'Ripple', binance: 'XRPUSDT' },
  ada: { symbol: 'ADA', name: 'Cardano', binance: 'ADAUSDT' },
  cardano: { symbol: 'ADA', name: 'Cardano', binance: 'ADAUSDT' },
  doge: { symbol: 'DOGE', name: 'Dogecoin', binance: 'DOGEUSDT' },
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin', binance: 'DOGEUSDT' },
  avax: { symbol: 'AVAX', name: 'Avalanche', binance: 'AVAXUSDT' },
  avalanche: { symbol: 'AVAX', name: 'Avalanche', binance: 'AVAXUSDT' },
  link: { symbol: 'LINK', name: 'Chainlink', binance: 'LINKUSDT' },
  chainlink: { symbol: 'LINK', name: 'Chainlink', binance: 'LINKUSDT' },
  dot: { symbol: 'DOT', name: 'Polkadot', binance: 'DOTUSDT' },
  polkadot: { symbol: 'DOT', name: 'Polkadot', binance: 'DOTUSDT' },
  matic: { symbol: 'MATIC', name: 'Polygon', binance: 'POLUSDT' },
  pol: { symbol: 'POL', name: 'Polygon', binance: 'POLUSDT' },
  polygon: { symbol: 'POL', name: 'Polygon', binance: 'POLUSDT' },
  near: { symbol: 'NEAR', name: 'NEAR Protocol', binance: 'NEARUSDT' },
  sui: { symbol: 'SUI', name: 'Sui', binance: 'SUIUSDT' },
  apt: { symbol: 'APT', name: 'Aptos', binance: 'APTUSDT' },
  pepe: { symbol: 'PEPE', name: 'Pepe', binance: 'PEPEUSDT' },
  shib: { symbol: 'SHIB', name: 'Shiba Inu', binance: 'SHIBUSDT' },
  ton: { symbol: 'TON', name: 'Toncoin', binance: 'TONUSDT' },
  trx: { symbol: 'TRX', name: 'TRON', binance: 'TRXUSDT' },
  ltc: { symbol: 'LTC', name: 'Litecoin', binance: 'LTCUSDT' }
};

export const CRYPTO_KEYWORDS = [
  'crypto', 'cryptocurrency', 'bitcoin', 'altcoin', 'token', 'coin', 'blockchain',
  'invest', 'investment', 'trade', 'trading', 'buy', 'sell', 'hodl', 'hold', 'dca',
  'bullish', 'bearish', 'rsi', 'macd', 'ema', 'sma', 'moving average', 'support',
  'resistance', 'breakout', 'stop loss', 'take profit', 'target', 'leverage', 'futures',
  'spot', 'wallet', 'metamask', 'ledger', 'binance', 'coinbase', 'bybit', 'kraken',
  'fear and greed', 'fng', 'market cap', 'volume', 'candlestick', 'chart', 'defi',
  'dex', 'uniswap', 'halving', 'etf', 'satoshi', 'vitalik', 'gas fee', 'gwei',
  'liquidity', 'pump', 'dump', 'airdrop', 'nft', 'yield', 'staking', 'pow', 'pos',
  'order book', 'slippage', 'arbitrage', 'dip', 'ath', 'all time high', 'atl',
  'news', 'headline', 'sec', 'regulation', 'whale', 'inflows', 'outflows', 'derivatives'
];

export const NON_CRYPTO_PATTERNS = [
  /\b(recipe|cook|bake|ingredients|dinner|lunch|breakfast|food|restaurant)\b/i,
  /\b(weather|forecast|rain|snow|temperature|sunny|umbrella)\b/i,
  /\b(movie|film|actor|actress|cinema|netflix|hollywood|oscars|series)\b/i,
  /\b(cricket|football|soccer|nba|nfl|baseball|ipl|world cup|tennis|messi|ronaldo)\b/i,
  /\b(president|election|democrat|republican|senate|parliament)\b(?!\s*crypto|\s*bitcoin|\s*sec)/i,
  /\b(relationship|dating|girlfriend|boyfriend|love advice|marriage)\b/i,
  /\b(homework|essay|physics|chemistry|biology|math problem)\b(?!\s*crypto)/i,
  /\b(joke|riddle|funny story|sing a song|write a poem)\b/i,
  /\b(repair car|plumbing|gardening|plant care|pet training)\b/i
];

export class GuardrailEngine {
  /**
   * Evaluates if a query belongs strictly to the crypto domain.
   * @param {string} query - The user's input message.
   * @returns {Object} Analysis result with isAllowed, detectedCoin, intent, and message.
   */
  static evaluate(query) {
    const cleanQuery = query.trim().toLowerCase();

    // 1. Check for explicit greetings or bot status
    if (/^(hi|hello|hey|greetings|who are you|what can you do|help|start)$/i.test(cleanQuery)) {
      return {
        isAllowed: true,
        intent: 'greeting',
        detectedCoin: null,
        message: null
      };
    }

    // 2. Check for explicit non-crypto matches
    for (const pattern of NON_CRYPTO_PATTERNS) {
      if (pattern.test(cleanQuery)) {
        // Double check if crypto keyword is present to avoid false rejection (e.g. "crypto election news")
        const hasCryptoContext = CRYPTO_KEYWORDS.some(kw => cleanQuery.includes(kw));
        if (!hasCryptoContext) {
          return {
            isAllowed: false,
            intent: 'off_topic',
            detectedCoin: null,
            message: GuardrailEngine.getRefusalMessage(query)
          };
        }
      }
    }

    // 3. Extract Coin if mentioned
    let detectedCoin = null;
    for (const [key, info] of Object.entries(CRYPTO_COINS)) {
      // Match whole words for short symbols to prevent substring false positives
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(cleanQuery)) {
        detectedCoin = info;
        break;
      }
    }

    // 4. Check for general crypto keywords or questions
    const matchedKeywords = CRYPTO_KEYWORDS.filter(kw => cleanQuery.includes(kw));
    const isCryptoRelated = detectedCoin !== null || matchedKeywords.length > 0;

    if (!isCryptoRelated) {
      return {
        isAllowed: false,
        intent: 'off_topic',
        detectedCoin: null,
        message: GuardrailEngine.getRefusalMessage(query)
      };
    }

    // 5. Determine user intent
    let intent = 'general_crypto';
    if (/(invest|buy|purchase|enter|trade|should i|good time|entry|long|short|sell)/i.test(cleanQuery)) {
      intent = 'invest_timing';
    } else if (/(rsi|macd|indicator|support|resistance|chart|trend|technical|ma|ema|moving average)/i.test(cleanQuery)) {
      intent = 'technical_analysis';
    } else if (/(news|headline|happening|update|announcement|fud|etf)/i.test(cleanQuery)) {
      intent = 'news_query';
    } else if (/(fear|greed|sentiment|mood|market sentiment)/i.test(cleanQuery)) {
      intent = 'sentiment_check';
    } else if (/(price|worth|value|rate|how much|target|ath)/i.test(cleanQuery)) {
      intent = 'price_check';
    }

    return {
      isAllowed: true,
      intent,
      detectedCoin: detectedCoin || { symbol: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT' },
      matchedKeywords,
      message: null
    };
  }

  /**
   * Generates a polite, stylish refusal message when an off-topic question is asked.
   */
  static getRefusalMessage(query) {
    const suggestions = [
      '⚡ "Should I invest in Bitcoin (BTC) right now?"',
      '📊 "Analyze Ethereum (ETH) RSI and technical indicators"',
      '📰 "What is the latest breaking crypto news?"',
      '🔮 "Is Solana (SOL) a good buy or should I wait?"',
      '🧭 "What does the Crypto Fear & Greed Index show today?"'
    ];

    return {
      title: '🛡️ Crypto Sentinel Guardrail Active',
      reason: `I am specialized exclusively as an **AI Crypto Trading & Market Intelligence Assistant**. My knowledge and analysis are strictly restricted to cryptocurrencies, digital assets, trading signals, and crypto news.`,
      guidance: 'Please ask any question related to crypto investing, token technicals, or market news:',
      suggestions
    };
  }
}
