/**
 * NexusCrypto AI - Investment Decision & Timing Engine
 * Synthesizes Live Technical Indicators, Fear & Greed Index, and News Sentiment
 * into clear INVEST / DO NOT INVEST / HOLD / ACCUMULATE verdicts with execution levels.
 */

import { IndicatorCalculator } from './indicators.js';

export class TradingEngine {
  /**
   * Generates a comprehensive investment recommendation
   */
  static analyzeInvestmentOpportunity({
    coin,
    ticker,
    klines,
    fearAndGreed,
    news,
    riskProfile = 'balanced' // 'conservative', 'balanced', 'aggressive'
  }) {
    const currentPrice = parseFloat(ticker.lastPrice);
    const closePrices = klines.map(k => k.close);

    // 1. Calculate Technicals
    const rsiData = IndicatorCalculator.calculateRSI(closePrices, 14);
    const ema20 = IndicatorCalculator.calculateEMA(closePrices, 20);
    const sma50 = IndicatorCalculator.calculateSMA(closePrices, 50);
    const trendData = IndicatorCalculator.evaluateTrend(currentPrice, ema20, sma50);
    const levels = IndicatorCalculator.findSupportResistance(klines);

    const priceChange = parseFloat(ticker.priceChangePercent);
    const fngValue = fearAndGreed ? fearAndGreed.value : 50;

    // 2. Confluence Scoring Engine (Base: 50)
    let confluenceScore = 50;
    const reasons = [];
    const warnings = [];

    // Factor A: RSI
    if (rsiData.value <= 30) {
      confluenceScore += 25;
      reasons.push(`RSI is deeply oversold at ${rsiData.value}, signaling strong seller exhaustion and high probability of mean-reversion upside.`);
    } else if (rsiData.value <= 40) {
      confluenceScore += 12;
      reasons.push(`RSI at ${rsiData.value} is in a favorable discount zone.`);
    } else if (rsiData.value >= 75) {
      confluenceScore -= 28;
      warnings.push(`RSI is overbought at ${rsiData.value}. High risk of immediate local correction or long squeeze.`);
    } else if (rsiData.value >= 65) {
      confluenceScore -= 12;
      warnings.push(`RSI at ${rsiData.value} indicates extended price action.`);
    } else {
      reasons.push(`RSI is balanced at ${rsiData.value}, showing stable momentum.`);
    }

    // Factor B: Trend & Moving Averages
    if (trendData.trend === 'STRONG_BULLISH') {
      confluenceScore += 20;
      reasons.push(`Price is trading above EMA 20 ($${ema20}) and SMA 50 ($${sma50}), confirming bullish market structure.`);
    } else if (trendData.trend === 'PULLBACK') {
      confluenceScore += 10;
      reasons.push(`Price pulled back to key dynamic support near SMA 50 ($${sma50}), offering an attractive dip-buying setup.`);
    } else if (trendData.trend === 'BEARISH') {
      confluenceScore -= 22;
      warnings.push(`Price is pinned below both EMA 20 and SMA 50. Bearish pressure dominates the short-term timeframe.`);
    } else {
      reasons.push(`Price is oscillating within range between $${levels.support} support and $${levels.resistance} resistance.`);
    }

    // Factor C: Fear & Greed Sentiment
    if (fngValue < 30) {
      confluenceScore += 12;
      reasons.push(`Market Fear & Greed is at ${fngValue} (${fearAndGreed.classification}). Warren Buffett principle: "Be greedy when others are fearful."`);
    } else if (fngValue > 75) {
      confluenceScore -= 15;
      warnings.push(`Market Sentiment is in Extreme Greed (${fngValue}). High likelihood of volatility flush.`);
    } else {
      reasons.push(`Market Sentiment is moderate at ${fngValue} (${fearAndGreed.classification}).`);
    }

    // Factor D: 24-Hour Price Action & Support Proximity
    if (levels.support > 0 && currentPrice <= levels.support * 1.015) {
      confluenceScore += 15;
      reasons.push(`Price is testing primary support at $${levels.support} with limited downside risk.`);
    }
    if (levels.resistance > 0 && currentPrice >= levels.resistance * 0.985) {
      confluenceScore -= 12;
      warnings.push(`Price is directly under major resistance ($${levels.resistance}). Breakout confirmation required before new entries.`);
    }

    // Factor E: News Sentiment Match
    const relatedNews = news.filter(n => {
      const txt = (n.title + ' ' + (n.categories || []).join(' ')).toLowerCase();
      return txt.includes(coin.symbol.toLowerCase()) || txt.includes(coin.name.toLowerCase());
    });

    if (relatedNews.length > 0) {
      const bullishNews = relatedNews.filter(n => n.sentiment === 'BULLISH').length;
      const bearishNews = relatedNews.filter(n => n.sentiment === 'BEARISH').length;
      if (bullishNews > bearishNews) {
        confluenceScore += 8;
        reasons.push(`Catalyst sentiment is positive with recent institutional/ecosystem developments.`);
      } else if (bearishNews > bullishNews) {
        confluenceScore -= 10;
        warnings.push(`Negative news headlines detected. Short-term headwind on sentiment.`);
      }
    }

    // Clamp score
    confluenceScore = Math.max(5, Math.min(95, confluenceScore));

    // 3. Derive Verdict
    let verdict = '';
    let verdictBadge = '';
    let actionRecommendation = '';
    let riskRating = 'MODERATE';

    if (confluenceScore >= 75) {
      verdict = 'INVEST: STRONG BUY';
      verdictBadge = 'badge-strong-buy';
      actionRecommendation = `Favorable technical and sentiment confluence. Ideal conditions for opening or scaling into spot / swing long positions.`;
      riskRating = 'LOW TO MODERATE';
    } else if (confluenceScore >= 60) {
      verdict = 'INVEST: DCA ACCUMULATE';
      verdictBadge = 'badge-accumulate';
      actionRecommendation = `Good accumulation zone. Recommend Dollar-Cost Averaging (DCA) in staged tranches rather than a single lump-sum.`;
      riskRating = 'MODERATE';
    } else if (confluenceScore >= 45) {
      verdict = 'DO NOT INVEST YET: HOLD & WAIT';
      verdictBadge = 'badge-hold';
      actionRecommendation = `Market is in neutral consolidation. Wait for a definitive breakout above $${levels.resistance} or a clean retest of $${levels.support}.`;
      riskRating = 'MODERATE TO HIGH';
    } else if (confluenceScore >= 30) {
      verdict = 'CAUTION: TAKE PROFIT / WAIT';
      verdictBadge = 'badge-caution';
      actionRecommendation = `Elevated downside risks or overextended rally. Protect profits with trailing stops; avoid new entries.`;
      riskRating = 'HIGH';
    } else {
      verdict = 'DO NOT INVEST: HIGH RISK DOWNSIDE';
      verdictBadge = 'badge-danger';
      actionRecommendation = `Indicators signal heavy selling pressure or breakdown below key support. High capital loss hazard. Stand aside in cash/USDT.`;
      riskRating = 'EXTREME';
    }

    // 4. Calculate Trade Execution Levels
    const supportPivot = levels.support > 0 ? levels.support : currentPrice * 0.96;
    const resistancePivot = levels.resistance > 0 ? levels.resistance : currentPrice * 1.06;

    const entryLow = parseFloat((currentPrice * 0.985).toFixed(coin.symbol === 'DOGE' || coin.symbol === 'XRP' ? 4 : 2));
    const entryHigh = parseFloat((currentPrice * 1.005).toFixed(coin.symbol === 'DOGE' || coin.symbol === 'XRP' ? 4 : 2));

    const stopLoss = parseFloat((Math.min(supportPivot * 0.98, currentPrice * 0.955)).toFixed(coin.symbol === 'DOGE' || coin.symbol === 'XRP' ? 4 : 2));
    const takeProfit1 = parseFloat((Math.max(currentPrice * 1.045, resistancePivot * 0.995)).toFixed(coin.symbol === 'DOGE' || coin.symbol === 'XRP' ? 4 : 2));
    const takeProfit2 = parseFloat((currentPrice * 1.095).toFixed(coin.symbol === 'DOGE' || coin.symbol === 'XRP' ? 4 : 2));

    const potentialLoss = currentPrice - stopLoss;
    const potentialGain = takeProfit1 - currentPrice;
    const riskReward = potentialLoss > 0 ? (potentialGain / potentialLoss).toFixed(1) : '2.5';

    return {
      coin,
      currentPrice,
      priceChange,
      confluenceScore,
      verdict,
      verdictBadge,
      actionRecommendation,
      riskRating,
      tradePlan: {
        entryZone: `$${entryLow} - $${entryHigh}`,
        takeProfit1: `$${takeProfit1} (+${(((takeProfit1 - currentPrice) / currentPrice) * 100).toFixed(1)}%)`,
        takeProfit2: `$${takeProfit2} (+${(((takeProfit2 - currentPrice) / currentPrice) * 100).toFixed(1)}%)`,
        stopLoss: `$${stopLoss} (-${(((currentPrice - stopLoss) / currentPrice) * 100).toFixed(1)}%)`,
        riskRewardRatio: `1 : ${riskReward}`
      },
      indicators: {
        rsi: rsiData,
        ema20,
        sma50,
        trend: trendData,
        support: levels.support,
        resistance: levels.resistance,
        fearAndGreed: fngValue,
        fngStatus: fearAndGreed ? fearAndGreed.classification : 'Neutral'
      },
      reasons,
      warnings,
      relatedNews
    };
  }

  /**
   * Formats an investment opportunity into a high-impact markdown / HTML response card
   */
  static formatInvestmentCard(analysis) {
    const isInvestVerdict = analysis.confluenceScore >= 60;
    const icon = isInvestVerdict ? '🟢' : analysis.confluenceScore >= 45 ? '🟡' : '🔴';

    return `
<div class="analysis-card ${analysis.verdictBadge}">
  <div class="card-header">
    <div class="coin-badge">
      <span class="coin-sym">${analysis.coin.symbol}</span>
      <span class="coin-full">${analysis.coin.name}</span>
    </div>
    <div class="price-box">
      <span class="current-price">$${analysis.currentPrice.toLocaleString()}</span>
      <span class="price-change ${analysis.priceChange >= 0 ? 'bull-green' : 'bear-red'}">
        ${analysis.priceChange >= 0 ? '▲' : '▼'} ${analysis.priceChange}%
      </span>
    </div>
  </div>

  <div class="verdict-banner">
    <div class="verdict-label">AI INVESTMENT VERDICT</div>
    <div class="verdict-title">${icon} ${analysis.verdict}</div>
    <div class="confluence-meter-wrap">
      <div class="confluence-label">
        <span>Signal Confluence Score</span>
        <strong>${analysis.confluenceScore}%</strong>
      </div>
      <div class="meter-bar">
        <div class="meter-fill" style="width: ${analysis.confluenceScore}%;"></div>
      </div>
    </div>
    <p class="verdict-summary">${analysis.actionRecommendation}</p>
  </div>

  <!-- Trade Setup Matrix -->
  <div class="trade-matrix">
    <div class="matrix-item">
      <span class="m-label">🎯 Target Entry Zone</span>
      <span class="m-val text-cyan">${analysis.tradePlan.entryZone}</span>
    </div>
    <div class="matrix-item">
      <span class="m-label">🚀 Take Profit 1</span>
      <span class="m-val text-green">${analysis.tradePlan.takeProfit1}</span>
    </div>
    <div class="matrix-item">
      <span class="m-label">💎 Take Profit 2 (Swing)</span>
      <span class="m-val text-green">${analysis.tradePlan.takeProfit2}</span>
    </div>
    <div class="matrix-item">
      <span class="m-label">🛑 Stop Loss (Invalidation)</span>
      <span class="m-val text-red">${analysis.tradePlan.stopLoss}</span>
    </div>
    <div class="matrix-item">
      <span class="m-label">⚖️ Risk / Reward Ratio</span>
      <span class="m-val">${analysis.tradePlan.riskRewardRatio}</span>
    </div>
    <div class="matrix-item">
      <span class="m-label">⚠️ Risk Assessment</span>
      <span class="m-val text-amber">${analysis.riskRating}</span>
    </div>
  </div>

  <!-- Key Technical Metrics -->
  <div class="metrics-grid">
    <div class="metric-pill">
      <span class="p-name">RSI (14)</span>
      <span class="p-val ${analysis.indicators.rsi.value <= 35 ? 'text-green' : analysis.indicators.rsi.value >= 70 ? 'text-red' : ''}">${analysis.indicators.rsi.value}</span>
      <span class="p-sub">${analysis.indicators.rsi.condition}</span>
    </div>
    <div class="metric-pill">
      <span class="p-name">20 EMA</span>
      <span class="p-val">$${analysis.indicators.ema20.toLocaleString()}</span>
      <span class="p-sub">${analysis.currentPrice >= analysis.indicators.ema20 ? 'Above (Bullish)' : 'Below (Bearish)'}</span>
    </div>
    <div class="metric-pill">
      <span class="p-name">50 SMA</span>
      <span class="p-val">$${analysis.indicators.sma50.toLocaleString()}</span>
      <span class="p-sub">Dynamic Baseline</span>
    </div>
    <div class="metric-pill">
      <span class="p-name">Fear & Greed</span>
      <span class="p-val text-amber">${analysis.indicators.fearAndGreed}</span>
      <span class="p-sub">${analysis.indicators.fngStatus}</span>
    </div>
  </div>

  <!-- Catalyst & Technical Breakdown -->
  <div class="breakdown-section">
    <div class="breakdown-col">
      <div class="b-title text-green">✅ Supporting Catalysts & Confluence</div>
      <ul>
        ${analysis.reasons.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
    ${analysis.warnings.length > 0 ? `
    <div class="breakdown-col">
      <div class="b-title text-red">⚠️ Risk Flags & Invalidation Triggers</div>
      <ul>
        ${analysis.warnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>

  <div class="card-actions-bar">
    <button class="card-action-btn view-live-graph-btn" data-symbol="${analysis.coin.symbol}">
      📈 View ${analysis.coin.symbol} on Live Trading Graph
    </button>
  </div>

  <div class="disclaimer-bar">
    🛡️ <strong>Risk Disclaimer:</strong> Algorithmic AI analysis for educational & tactical research. Crypto markets involve extreme volatility. Never risk capital you cannot afford to lose. Always perform your own due diligence (DYOR).
  </div>
</div>
`;
  }
}
