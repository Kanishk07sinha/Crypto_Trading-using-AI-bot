/**
 * NexusCrypto AI - Technical Indicators Service
 * Calculates RSI (14), EMA (20), SMA (50), Support/Resistance, and Trend Signals.
 */

export class IndicatorCalculator {
  /**
   * Calculate Relative Strength Index (RSI) using 14-period Wilder's smoothing.
   * @param {Array<number>} closePrices - array of closing prices (at least 15 required)
   * @param {number} period - default 14
   */
  static calculateRSI(closePrices, period = 14) {
    if (!closePrices || closePrices.length <= period) {
      return { value: 50.0, condition: 'NEUTRAL', interpretation: 'Insufficient historical candles for exact RSI.' };
    }

    let gains = [];
    let losses = [];

    for (let i = 1; i < closePrices.length; i++) {
      const diff = closePrices[i] - closePrices[i - 1];
      gains.push(Math.max(0, diff));
      losses.push(Math.max(0, -diff));
    }

    // Initial average gain/loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Wilder's smoothing for remaining periods
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) {
      return { value: 100.0, condition: 'EXTREME_OVERBOUGHT', interpretation: 'Extreme buying pressure without pullbacks.' };
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    const roundedRsi = parseFloat(rsi.toFixed(1));

    let condition = 'NEUTRAL';
    let interpretation = 'Momentum is balanced between buyers and sellers.';

    if (roundedRsi <= 25) {
      condition = 'EXTREME_OVERSOLD';
      interpretation = 'Severely oversold. High probability of mean-reversion relief bounce or accumulation zone.';
    } else if (roundedRsi <= 35) {
      condition = 'OVERSOLD';
      interpretation = 'Oversold territory. Selling momentum is exhausting; prime candidate for DCA entries.';
    } else if (roundedRsi >= 75) {
      condition = 'EXTREME_OVERBOUGHT';
      interpretation = 'High risk of sharp pullback or profit-taking. Do not chase green candles.';
    } else if (roundedRsi >= 65) {
      condition = 'OVERBOUGHT';
      interpretation = 'Overextended in the short term. Caution advised for new lump-sum entries.';
    } else if (roundedRsi >= 50) {
      condition = 'BULLISH_MOMENTUM';
      interpretation = 'Healthy bullish continuation momentum above the 50 midline.';
    } else {
      condition = 'BEARISH_LEAN';
      interpretation = 'Weak momentum below the 50 midline. Sellers have slight dominance.';
    }

    return { value: roundedRsi, condition, interpretation };
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  static calculateEMA(prices, period = 20) {
    if (!prices || prices.length === 0) return 0;
    if (prices.length < period) period = prices.length;

    const k = 2 / (period + 1);
    // Initial SMA
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return parseFloat(ema.toFixed(2));
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  static calculateSMA(prices, period = 50) {
    if (!prices || prices.length === 0) return 0;
    const effectivePeriod = Math.min(prices.length, period);
    const slice = prices.slice(-effectivePeriod);
    const sum = slice.reduce((a, b) => a + b, 0);
    return parseFloat((sum / effectivePeriod).toFixed(2));
  }

  /**
   * Determine Trend and Moving Average Confluence
   */
  static evaluateTrend(currentPrice, ema20, sma50) {
    let trend = 'NEUTRAL';
    let status = 'Range-bound / Consolidation';

    if (currentPrice > ema20 && ema20 > sma50) {
      trend = 'STRONG_BULLISH';
      status = 'Full bullish alignment (Price > EMA20 > SMA50). Upward impulse confirmed.';
    } else if (currentPrice > ema20 && currentPrice < sma50) {
      trend = 'RECOVERY';
      status = 'Short-term recovery test. Testing resistance at the 50 SMA.';
    } else if (currentPrice < ema20 && ema20 > sma50) {
      trend = 'PULLBACK';
      status = 'Bullish trend healthy pullback towards 50 SMA support.';
    } else if (currentPrice < ema20 && ema20 < sma50) {
      trend = 'BEARISH';
      status = 'Bearish trend alignment (Price < EMA20 < SMA50). Caution warranted.';
    }

    return { trend, status };
  }

  /**
   * Identify Support and Resistance levels from klines
   */
  static findSupportResistance(klines) {
    if (!klines || klines.length < 5) {
      return { support: 0, resistance: 0 };
    }

    const highs = klines.map(c => c.high);
    const lows = klines.map(c => c.low);

    const resistance = Math.max(...highs.slice(-15));
    const support = Math.min(...lows.slice(-15));

    return {
      support: parseFloat(support.toFixed(2)),
      resistance: parseFloat(resistance.toFixed(2))
    };
  }
}
