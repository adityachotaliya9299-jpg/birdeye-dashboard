'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Token {
  address: string;
  symbol: string;
  name: string;
  price: number;
  volume24hUSD: number;
  v24hUSD?: number;
  price24hChangePercent: number;
  v24hChangePercent?: number;
  volume24hChangePercent?: number;
  logoURI?: string;
  rank?: number;
  liquidity?: number;
  fdv?: number;
  marketcap?: number;
  mc?: number;
  safetyScore?: number;
  momentumScore?: number;
  riskReason?: string;
  rugProbability?: number;
}

interface Alert {
  token: Token;
  time: string;
  type: 'whale' | 'breakout';
}

interface SolanaStats {
  solPrice: number;
  totalVolume: number;
  trendingCount: number;
}

// ─── ANIMATED COUNTER HOOK ────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 900, decimals = 0) {
  const [value, setValue] = useState(target);
  const prevTargetRef = useRef(target);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setValue(target);
      prevTargetRef.current = target;
      return;
    }
    if (target === prevTargetRef.current) return;
    const from = prevTargetRef.current;
    prevTargetRef.current = target;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(parseFloat((from + (target - from) * eased).toFixed(decimals)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return value;
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
function calcRiskScore(token: Token): { score: number; reason: string; rugProbability: number } {
  let score = 100;
  const reasons: string[] = [];
  const liq = token.liquidity || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const fdv = token.fdv || token.mc || token.marketcap || 0;
  const priceChange = Math.abs(token.price24hChangePercent || 0);
  const volChange = Math.abs(token.volume24hChangePercent || token.v24hChangePercent || 0);

  if (liq < 10000)       { score -= 35; reasons.push('very low liquidity'); }
  else if (liq < 50000)  { score -= 20; reasons.push('low liquidity'); }
  else if (liq < 200000) { score -= 10; reasons.push('moderate liquidity'); }

  if (liq > 0 && vol / liq > 100) { score -= 20; reasons.push('suspicious vol/liq ratio'); }

  if (priceChange > 5000)      { score -= 30; reasons.push('extreme pump'); }
  else if (priceChange > 1000) { score -= 20; reasons.push('very high pump'); }
  else if (priceChange > 200)  { score -= 10; reasons.push('high pump'); }

  if (fdv < 50000)       { score -= 15; reasons.push('micro cap'); }
  else if (fdv < 200000) { score -= 8;  reasons.push('small cap'); }

  if (volChange > 10000) { score -= 15; reasons.push('bot volume suspected'); }

  const finalScore = Math.max(0, Math.min(100, score));
  // Rug probability = inverse of safety, with non-linear weighting
  const rugProbability = Math.round(Math.pow((100 - finalScore) / 100, 0.7) * 100);

  return {
    score: finalScore,
    reason: reasons.slice(0, 2).join(', ') || 'looks stable',
    rugProbability,
  };
}

function calcMomentum(token: Token): number {
  const priceChange = token.price24hChangePercent || 0;
  const volChange = token.volume24hChangePercent || token.v24hChangePercent || 0;
  const liq = token.liquidity || 1;
  if (priceChange <= 0) return 0;
  let score = 0;
  score += Math.min(40, priceChange / 100 * 10);
  score += Math.min(30, Math.max(0, volChange) / 100 * 8);
  score += Math.min(30, Math.log10(liq + 1) * 5);
  return Math.min(100, Math.round(score));
}

function calcFearGreed(tokens: Token[]): { score: number; label: string; colorClass: string; hex: string } {
  if (tokens.length === 0) return { score: 50, label: 'Neutral', colorClass: 'text-yellow-400', hex: '#facc15' };
  const avgChange = tokens.reduce((sum, t) => sum + (t.price24hChangePercent || 0), 0) / tokens.length;
  const gainers = tokens.filter(t => (t.price24hChangePercent || 0) > 0).length;
  const greedRatio = gainers / tokens.length;
  const avgSafety = tokens.reduce((sum, t) => sum + (t.safetyScore || 50), 0) / tokens.length;
  let score = 50;
  score += Math.min(25, avgChange / 100 * 5);
  score += (greedRatio - 0.5) * 30;
  score += (avgSafety - 50) * 0.3;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 75 ? 'Extreme Greed' : score >= 60 ? 'Greed' : score >= 40 ? 'Neutral' : score >= 25 ? 'Fear' : 'Extreme Fear';
  const colorClass = score >= 75 ? 'text-emerald-400' : score >= 60 ? 'text-lime-400' : score >= 40 ? 'text-yellow-400' : score >= 25 ? 'text-orange-400' : 'text-rose-500';
  const hex = score >= 75 ? '#34d399' : score >= 60 ? '#a3e635' : score >= 40 ? '#facc15' : score >= 25 ? '#fb923c' : '#f43f5e';
  return { score, label, colorClass, hex };
}

// ─── RUG PULL BADGE (replaces SAFE/CAUTION/RISKY) ────────────────────────────
function RugPullBadge({ rugProbability, safetyScore }: { rugProbability: number; safetyScore: number }) {
  const isSafe    = safetyScore >= 70;
  const isCaution = safetyScore >= 40;

  const { bg, border, text, dot } = isSafe
    ? { bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', text: 'text-emerald-400', dot: 'bg-emerald-400' }
    : isCaution
    ? { bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30',  text: 'text-yellow-400',  dot: 'bg-yellow-400' }
    : { bg: 'bg-rose-400/10',    border: 'border-rose-400/30',    text: 'text-rose-400',    dot: 'bg-rose-400' };

  const label = isSafe ? 'LOW RUG RISK' : isCaution ? 'MODERATE' : 'HIGH RUG RISK';

  return (
    <span className={`badge-pop inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border whitespace-nowrap ${bg} ${border} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {rugProbability}% RUG · {label}
    </span>
  );
}

// ─── MOMENTUM BAR ─────────────────────────────────────────────────────────────
function MomentumBar({ score }: { score: number }) {
  const colorHex = score >= 70 ? '#34d399' : score >= 40 ? '#facc15' : '#9ca3af';
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Momentum</span>
        <span className="font-mono text-xs font-bold" style={{ color: colorHex }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800/50 overflow-hidden">
        <div className="h-full rounded-full momentum-bar-fill"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, transparent, ${colorHex})` }} />
      </div>
    </div>
  );
}

// ─── SOLANA STATS BAR ─────────────────────────────────────────────────────────
function SolanaStatsBar({ stats, trending }: { stats: SolanaStats; trending: Token[] }) {
  const totalVol = trending.reduce((sum, t) => sum + (t.volume24hUSD || 0), 0);
  const avgSafety = trending.length > 0
    ? Math.round(trending.reduce((sum, t) => sum + (t.safetyScore || 50), 0) / trending.length)
    : 0;
  const animSol    = useAnimatedCounter(stats.solPrice, 900, 2);
  const animVol    = useAnimatedCounter(totalVol / 1_000_000, 900, 1);
  const animSafety = useAnimatedCounter(avgSafety, 800);

  return (
    <div className="bg-zinc-900/60 border-b border-zinc-800/50 overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-4 sm:gap-6 text-xs whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">SOL</span>
          <span className="font-mono font-bold text-white">${animSol.toFixed(2)}</span>
        </div>
        <div className="w-px h-3 bg-zinc-700" />
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 hidden sm:inline">24h Vol</span>
          <span className="font-mono font-bold text-cyan-400">${animVol.toFixed(1)}M</span>
        </div>
        <div className="w-px h-3 bg-zinc-700" />
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 hidden sm:inline">Avg Safety</span>
          <span className="font-mono font-bold text-emerald-400">{animSafety}/100</span>
        </div>
        <div className="w-px h-3 bg-zinc-700" />
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
          <span className="text-emerald-400 font-medium">Live</span>
        </div>
      </div>
    </div>
  );
}

// ─── FEAR & GREED METER ───────────────────────────────────────────────────────
function FearGreedMeter({ tokens }: { tokens: Token[] }) {
  const { score, label, colorClass, hex } = calcFearGreed(tokens);
  const circumference = 2 * Math.PI * 36;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const progress = drawn ? (score / 100) * circumference : 0;
  const animScore = useAnimatedCounter(drawn ? score : 0, 1200);

  return (
    <div className="flex items-center gap-4 sm:gap-6 p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
      <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="36" fill="none" stroke="#27272a" strokeWidth="8" />
          <circle cx="50" cy="50" r="36" fill="none" stroke={hex} strokeWidth="8"
            strokeLinecap="round" transform="rotate(-90 50 50)"
            strokeDasharray={`${progress} ${circumference}`}
            strokeDashoffset="0" className="fg-circle" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xl sm:text-2xl font-bold text-white">{Math.round(animScore)}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-1">Market Sentiment</p>
        <p className={`text-xl sm:text-2xl font-bold ${colorClass}`}>{label}</p>
        <p className="text-xs text-zinc-500 mt-1.5">Based on <span className="text-zinc-300 font-mono">{tokens.length}</span> tokens</p>
      </div>
    </div>
  );
}

// ─── TOP MOVERS ───────────────────────────────────────────────────────────────
function TopMovers({ tokens, onSelect }: { tokens: Token[]; onSelect: (t: Token) => void }) {
  if (tokens.length === 0) return null;
  const topGainers = [...tokens].sort((a, b) => (b.price24hChangePercent||0) - (a.price24hChangePercent||0)).slice(0, 3);
  const topVolume  = [...tokens].sort((a, b) => (b.volume24hChangePercent||0) - (a.volume24hChangePercent||0)).slice(0, 3);
  const topSafe    = [...tokens].filter(t => (t.safetyScore||0) >= 70).sort((a, b) => (b.safetyScore||0) - (a.safetyScore||0)).slice(0, 3);

  const Section = ({ title, icon, items, valueFormat, colorClass }: any) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{icon}</span>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{title}</p>
      </div>
      <div className="space-y-2">
        {items.map((token: Token, i: number) => (
          <div key={token.address} onClick={() => onSelect(token)}
            className="flex items-center gap-2 sm:gap-3 p-2 rounded-xl cursor-pointer bg-zinc-950/50 border border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 active:bg-zinc-800 transition-all">
            <span className="text-[10px] font-mono text-zinc-600 w-4 flex-shrink-0">{i + 1}</span>
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-5 h-5 rounded-full flex-shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : <div className="w-5 h-5 rounded-full bg-zinc-800 flex-shrink-0" />}
            <span className="text-sm font-bold text-zinc-200 truncate flex-1">{token.symbol}</span>
            <span className={`text-xs font-mono font-bold whitespace-nowrap flex-shrink-0 ${colorClass}`}>{valueFormat(token)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <p className="text-sm font-bold text-white uppercase tracking-wider">Top Movers</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <Section title="Gainers"  icon="🚀" items={topGainers} colorClass="text-emerald-400" valueFormat={(t: Token) => `+${(t.price24hChangePercent||0).toFixed(0)}%`} />
        <Section title="Vol"      icon="🐋" items={topVolume}  colorClass="text-cyan-400"    valueFormat={(t: Token) => `+${(t.volume24hChangePercent||0).toFixed(0)}%`} />
        <Section title="Safest"   icon="🛡️" items={topSafe}   colorClass="text-emerald-400" valueFormat={(t: Token) => `${t.safetyScore}`} />
      </div>
    </div>
  );
}

// ─── COMPARE MODAL ────────────────────────────────────────────────────────────
function CompareModal({ tokens, onClose }: { tokens: [Token, Token]; onClose: () => void }) {
  const [a, b] = tokens;
  const metrics = [
    { label: 'Price',       aVal: `$${a.price < 0.001 ? a.price.toExponential(2) : a.price.toFixed(4)}`, bVal: `$${b.price < 0.001 ? b.price.toExponential(2) : b.price.toFixed(4)}`, winner: null },
    { label: '24h Change',  aVal: `${(a.price24hChangePercent||0).toFixed(1)}%`, bVal: `${(b.price24hChangePercent||0).toFixed(1)}%`, winner: (a.price24hChangePercent||0) > (b.price24hChangePercent||0) ? 'a' : 'b' },
    { label: 'Volume',      aVal: `$${((a.volume24hUSD||0)/1e6).toFixed(2)}M`,  bVal: `$${((b.volume24hUSD||0)/1e6).toFixed(2)}M`,  winner: (a.volume24hUSD||0) > (b.volume24hUSD||0) ? 'a' : 'b' },
    { label: 'Rug Risk',    aVal: `${a.rugProbability}%`, bVal: `${b.rugProbability}%`, winner: (a.rugProbability||100) < (b.rugProbability||100) ? 'a' : 'b' },
    { label: 'Momentum',    aVal: `${a.momentumScore}/100`, bVal: `${b.momentumScore}/100`, winner: (a.momentumScore||0) > (b.momentumScore||0) ? 'a' : 'b' },
    { label: 'Liquidity',   aVal: `$${((a.liquidity||0)/1000).toFixed(0)}K`, bVal: `$${((b.liquidity||0)/1000).toFixed(0)}K`, winner: (a.liquidity||0) > (b.liquidity||0) ? 'a' : 'b' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg p-5 sm:p-6 rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl card-enter card-enter-1" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">⚔️ Compare</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-full transition-colors">✕</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 text-center rounded-2xl bg-zinc-900 border border-zinc-800">
            {a.logoURI && <img src={a.logoURI} alt={a.symbol} className="w-8 h-8 mx-auto mb-1.5 rounded-full" onError={(e) => { e.currentTarget.style.display='none'; }} />}
            <p className="text-sm font-bold text-white">{a.symbol}</p>
          </div>
          <div className="flex items-center justify-center text-2xl text-zinc-700 font-black italic">VS</div>
          <div className="p-3 text-center rounded-2xl bg-zinc-900 border border-zinc-800">
            {b.logoURI && <img src={b.logoURI} alt={b.symbol} className="w-8 h-8 mx-auto mb-1.5 rounded-full" onError={(e) => { e.currentTarget.style.display='none'; }} />}
            <p className="text-sm font-bold text-white">{b.symbol}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {metrics.map(({ label, aVal, bVal, winner }) => (
            <div key={label} className="grid grid-cols-3 gap-3 items-center">
              <div className={`p-2 text-center rounded-xl ${winner==='a' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                <p className={`font-mono text-xs font-bold ${winner==='a' ? 'text-emerald-400' : 'text-zinc-300'}`}>{aVal}</p>
              </div>
              <p className="text-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
              <div className={`p-2 text-center rounded-xl ${winner==='b' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                <p className={`font-mono text-xs font-bold ${winner==='b' ? 'text-emerald-400' : 'text-zinc-300'}`}>{bVal}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WATCHLIST BUTTON ─────────────────────────────────────────────────────────
function WatchlistButton({ token, watchlist, onToggle }: { token: Token; watchlist: string[]; onToggle: (address: string) => void }) {
  const isWatched = watchlist.includes(token.address);
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(token.address); }}
      className={`p-1.5 rounded-lg transition-all duration-200 active:scale-90 ${
        isWatched ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-500 bg-zinc-800/80 hover:text-yellow-400 hover:bg-yellow-400/10'
      }`}
      title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}>
      {isWatched ? '★' : '☆'}
    </button>
  );
}

// ─── TOKEN CARD ───────────────────────────────────────────────────────────────
// FIX: action buttons always visible on mobile (sm:opacity-0 sm:group-hover:opacity-100)
function TokenCard({ token, onClick, onCompare, isCompareSelected, watchlist, onWatchlistToggle, index }: {
  token: Token; onClick: () => void; onCompare: (t: Token) => void;
  isCompareSelected: boolean; watchlist: string[]; onWatchlistToggle: (address: string) => void;
  index: number;
}) {
  const isUp = (token.price24hChangePercent || 0) > 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const priceStr = token.price < 0.001 ? token.price.toExponential(2)
    : token.price < 1 ? token.price.toFixed(4)
    : token.price.toFixed(2);

  const safetyScore = token.safetyScore || 0;
  const glowClass = safetyScore >= 70 ? 'card-glow-safe' : safetyScore >= 40 ? 'card-glow-caution' : 'card-glow-risky';
  const radialColor = safetyScore >= 70 ? 'rgba(52,211,153,0.05)' : safetyScore >= 40 ? 'rgba(250,204,21,0.04)' : 'rgba(244,63,94,0.04)';
  const staggerIdx = Math.min(index + 1, 20);

  return (
    <div
      className={`card-enter card-enter-${staggerIdx} group relative p-4 sm:p-5 rounded-2xl cursor-pointer border ${glowClass} ${
        isCompareSelected
          ? 'bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
          : 'bg-zinc-900/50 border-zinc-800/80'
      }`}
      onClick={onClick}
    >
      {/* Hover glow layer */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${radialColor}, transparent 70%)` }} />

      {/* Action buttons row — ALWAYS visible on mobile, hover-only on desktop */}
      <div className="flex items-center justify-end gap-1.5 mb-3" onClick={e => e.stopPropagation()}>
        <WatchlistButton token={token} watchlist={watchlist} onToggle={onWatchlistToggle} />
        {/* Share — visible on mobile always, desktop hover */}
        <button
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?token=${token.address}`); alert('Link copied!'); }}
          className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-500 hover:text-white hover:bg-zinc-700 active:scale-90 transition-all sm:opacity-0 sm:group-hover:opacity-100 text-xs"
          title="Share">🔗
        </button>
        {/* Compare — visible on mobile always, desktop hover */}
        <button
          onClick={() => onCompare(token)}
          className={`px-2 py-1 text-xs font-bold rounded-lg transition-all active:scale-90 sm:opacity-0 sm:group-hover:opacity-100 ${
            isCompareSelected ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800/80 text-zinc-500 hover:text-white hover:bg-zinc-700'
          }`}>⚔️
        </button>
      </div>

      {/* Token header */}
      <div className="flex items-center gap-3 mb-3">
        {token.logoURI ? (
          <img src={token.logoURI} alt={token.symbol}
            className="w-10 h-10 rounded-full flex-shrink-0 bg-zinc-950 ring-1 ring-zinc-800"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 flex-shrink-0">
            {token.symbol?.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-white truncate">{token.symbol}</p>
          <p className="text-xs text-zinc-500 truncate">{token.name}</p>
        </div>
      </div>

      {/* Rug Pull Badge */}
      <div className="mb-3">
        {token.rugProbability !== undefined && token.safetyScore !== undefined && (
          <RugPullBadge rugProbability={token.rugProbability} safetyScore={token.safetyScore} />
        )}
      </div>

      {/* Price + Change */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-lg font-bold text-white leading-none mb-1">${priceStr}</p>
          <p className="font-mono text-[11px] text-zinc-500">Vol: ${(vol / 1_000_000).toFixed(2)}M</p>
        </div>
        <div className="text-right">
          <span className={`font-mono text-sm font-bold block mb-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(token.price24hChangePercent || 0).toFixed(2)}%
          </span>
          {token.liquidity && (
            <p className="font-mono text-[10px] text-zinc-600">Liq: ${(token.liquidity / 1000).toFixed(0)}K</p>
          )}
        </div>
      </div>

      {token.momentumScore !== undefined && <MomentumBar score={token.momentumScore} />}
    </div>
  );
}

// ─── WHALE CARD ───────────────────────────────────────────────────────────────
function WhaleCard({ token, onClick }: { token: Token; onClick: () => void }) {
  const volChange = token.volume24hChangePercent || token.v24hChangePercent || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  return (
    <div onClick={onClick}
      className="flex-shrink-0 w-48 sm:w-56 p-4 rounded-2xl cursor-pointer border border-emerald-500/30 hover:border-emerald-400/50 active:scale-[0.98] hover:-translate-y-1.5 hover:shadow-[0_8px_24px_rgba(52,211,153,0.15)] transition-all duration-300 whale-shimmer">
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        {token.logoURI && <img src={token.logoURI} alt={token.symbol} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-950"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <span className="text-sm font-bold text-white truncate">{token.symbol}</span>
        <span className="ml-auto text-lg sm:text-xl">🐋</span>
      </div>
      <p className="text-sm font-bold text-emerald-400 mb-0.5">+{volChange.toFixed(0)}% Vol</p>
      <p className="text-xs text-zinc-400 font-mono mb-2">${(vol / 1_000_000).toFixed(2)}M traded</p>
      <p className="font-mono text-sm font-bold text-white">
        ${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}
      </p>
    </div>
  );
}

// ─── ALERT LOG ────────────────────────────────────────────────────────────────
function AlertLog({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-lg">🔔</span>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Alerts</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Last {alerts.length}</span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
            <span>{alert.type === 'whale' ? '🐋' : '🚀'}</span>
            <span className="font-bold text-white text-sm">{alert.token.symbol}</span>
            <span className="font-mono text-xs font-bold text-emerald-400">+{(alert.token.volume24hChangePercent || 0).toFixed(0)}% vol</span>
            <span className="font-mono text-xs font-bold text-emerald-400">+{(alert.token.price24hChangePercent || 0).toFixed(0)}% price</span>
            <span className="ml-auto text-xs font-mono text-zinc-500">{alert.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TOKEN MODAL ──────────────────────────────────────────────────────────────
function TokenModal({ token, onClose, watchlist, onWatchlistToggle }: {
  token: Token; onClose: () => void; watchlist: string[]; onWatchlistToggle: (address: string) => void;
}) {
  const isUp = (token.price24hChangePercent || 0) > 0;
  const fdv = token.fdv || token.mc || token.marketcap || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const safetyHex = (token.safetyScore || 0) >= 70 ? '#34d399' : (token.safetyScore || 0) >= 40 ? '#facc15' : '#f43f5e';
  const isWatched = watchlist.includes(token.address);
  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}?token=${token.address}` : '';

  return (
    // Bottom sheet on mobile, centered modal on desktop
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md p-5 sm:p-6 sm:my-8 rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl relative card-enter card-enter-1" onClick={e => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: safetyHex }} />

        <div className="flex items-start justify-between mb-5 relative">
          <div className="flex items-center gap-3">
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-900 border-2 border-zinc-800"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500">
                {token.symbol?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{token.symbol}</h2>
              <p className="text-xs sm:text-sm text-zinc-400">{token.name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-full transition-colors active:scale-90">✕</button>
            <button onClick={() => onWatchlistToggle(token.address)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all border active:scale-95 ${
                isWatched ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-yellow-400/30 hover:text-yellow-400'
              }`}>{isWatched ? '★ Watching' : '☆ Watch'}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(shareLink); alert('Link copied!'); }}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 active:scale-95 transition-all font-medium">
              🔗 Share
            </button>
          </div>
        </div>

        {/* Rug Pull Badge in modal */}
        {token.rugProbability !== undefined && token.safetyScore !== undefined && (
          <div className="mb-4">
            <RugPullBadge rugProbability={token.rugProbability} safetyScore={token.safetyScore} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-5 relative">
          {[
            { label: 'Price',        value: `$${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}` },
            { label: '24h Change',   value: `${isUp ? '+' : ''}${(token.price24hChangePercent || 0).toFixed(2)}%`, colorClass: isUp ? 'text-emerald-400' : 'text-rose-400' },
            { label: 'Volume 24h',   value: `$${(vol / 1_000_000).toFixed(2)}M` },
            { label: 'Liquidity',    value: token.liquidity ? `$${(token.liquidity / 1000).toFixed(0)}K` : 'N/A' },
            { label: 'Rug Risk',     value: `${token.rugProbability}%`, colorClass: (token.rugProbability||0) > 50 ? 'text-rose-400' : (token.rugProbability||0) > 25 ? 'text-yellow-400' : 'text-emerald-400' },
            { label: 'FDV / MCap',   value: fdv ? `$${(fdv / 1_000_000).toFixed(2)}M` : 'N/A' },
          ].map(({ label, value, colorClass }) => (
            <div key={label} className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
              <p className={`font-mono text-sm font-bold ${colorClass || 'text-zinc-200'}`}>{value}</p>
            </div>
          ))}
        </div>

        {token.safetyScore !== undefined && (
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Risk Analysis</span>
              <span className="text-xs font-mono text-zinc-400">{token.safetyScore}/100 safe</span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">{token.riskReason}</p>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full momentum-bar-fill" style={{ width: `${token.safetyScore}%`, backgroundColor: safetyHex }} />
            </div>
          </div>
        )}

        <p className="text-[9px] sm:text-[10px] font-mono text-zinc-600 break-all mb-5 text-center">{token.address}</p>
        <button onClick={() => window.open(`https://birdeye.so/token/${token.address}?chain=solana`, '_blank')}
          className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm text-zinc-950 transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ backgroundColor: safetyHex }}>
          View on Birdeye ↗
        </button>
      </div>
    </div>
  );
}

// ─── SKELETON CARD ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/30">
      <div className="flex items-center justify-end gap-1.5 mb-3">
        <div className="w-7 h-7 skeleton-shimmer rounded-lg" />
        <div className="w-7 h-7 skeleton-shimmer rounded-lg" />
        <div className="w-10 h-7 skeleton-shimmer rounded-lg" />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full skeleton-shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-16 skeleton-shimmer" />
          <div className="h-2 w-24 skeleton-shimmer" />
        </div>
      </div>
      <div className="h-5 w-28 skeleton-shimmer mb-3" />
      <div className="h-5 w-20 skeleton-shimmer mb-1" />
      <div className="h-3 w-28 skeleton-shimmer mb-4" />
      <div className="h-1.5 w-full skeleton-shimmer" />
    </div>
  );
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type FilterType = 'all' | 'safe' | 'gainers' | 'momentum' | 'watchlist';
type SortType   = 'default' | 'price_high' | 'price_low' | 'volume' | 'safety' | 'momentum' | 'change';

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [trending, setTrending]           = useState<Token[]>([]);
  const [newListings, setNewListings]     = useState<Token[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<'trending' | 'new'>('trending');
  const [filter, setFilter]               = useState<FilterType>('all');
  const [sortBy, setSortBy]               = useState<SortType>('default');
  const [lastUpdated, setLastUpdated]     = useState('');
  const [spinning, setSpinning]           = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [search, setSearch]               = useState('');
  const [alerts, setAlerts]               = useState<Alert[]>([]);
  const [compareTokens, setCompareTokens] = useState<Token[]>([]);
  const [showCompare, setShowCompare]     = useState(false);
  const [watchlist, setWatchlist]         = useState<string[]>([]);
  const [solanaStats, setSolanaStats]     = useState<SolanaStats>({ solPrice: 0, totalVolume: 0, trendingCount: 0 });
  const [refreshKey, setRefreshKey]       = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('birdradar_watchlist');
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleWatchlist = (address: string) => {
    setWatchlist(prev => {
      const next = prev.includes(address) ? prev.filter(a => a !== address) : [...prev, address];
      try { localStorage.setItem('birdradar_watchlist', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenAddress = params.get('token');
    if (tokenAddress && (trending.length > 0 || newListings.length > 0)) {
      const found = [...trending, ...newListings].find(t => t.address === tokenAddress);
      if (found) setSelectedToken(found);
    }
  }, [trending, newListings]);

  const enrichTokens = (tokens: Token[]): Token[] =>
    tokens.map(token => {
      const { score, reason, rugProbability } = calcRiskScore(token);
      return { ...token, safetyScore: score, momentumScore: calcMomentum(token), riskReason: reason, rugProbability };
    });

  const fetchData = useCallback(async () => {
    setSpinning(true);
    setLoading(true);
    try {
      const [trendRes, newRes] = await Promise.all([fetch('/api/trending'), fetch('/api/new-listings')]);
      const trendData = await trendRes.json();
      const newData   = await newRes.json();
      const enrichedTrending = enrichTokens(trendData?.data?.tokens || []);
      setTrending(enrichedTrending);
      setNewListings(enrichTokens((newData?.data?.tokens || []).slice(0, 20)));
      setLastUpdated(new Date().toLocaleTimeString());
      setRefreshKey(k => k + 1);

      const solToken = newData?.data?.tokens?.find((t: any) =>
        t.symbol === 'SOL' || t.address === 'So11111111111111111111111111111111111111112');
      setSolanaStats({
        solPrice: solToken?.price || 0,
        totalVolume: enrichedTrending.reduce((sum, t) => sum + (t.volume24hUSD || 0), 0),
        trendingCount: newData?.data?.tokens?.length || 0,
      });

      const newAlerts: Alert[] = enrichedTrending
        .filter(t => (t.volume24hChangePercent || 0) > 200 && (t.safetyScore || 0) >= 50)
        .slice(0, 5)
        .map(t => ({
          token: t,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: (t.volume24hChangePercent || 0) > 500 ? 'whale' : 'breakout',
        }));
      if (newAlerts.length > 0) setAlerts(newAlerts);
    } catch (err) { console.error(err); }
    setLoading(false);
    setTimeout(() => setSpinning(false), 500);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCompare = (token: Token) => {
    setCompareTokens(prev => {
      if (prev.find(t => t.address === token.address)) return prev.filter(t => t.address !== token.address);
      if (prev.length >= 2) return [prev[1], token];
      return [...prev, token];
    });
  };

  useEffect(() => {
    if (compareTokens.length === 2) setShowCompare(true);
  }, [compareTokens]);

  const whaleAlerts = trending
    .filter(t => (t.volume24hChangePercent || t.v24hChangePercent || 0) > 100 && (t.volume24hUSD || 0) > 10000)
    .sort((a, b) => (b.volume24hChangePercent || 0) - (a.volume24hChangePercent || 0))
    .slice(0, 8);

  const baseTokens = activeTab === 'trending' ? trending : newListings;

  const sortedFiltered = baseTokens
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.symbol?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q);
    })
    .filter(t => {
      if (filter === 'safe')      return (t.safetyScore || 0) >= 70;
      if (filter === 'gainers')   return (t.price24hChangePercent || 0) > 50;
      if (filter === 'momentum')  return (t.momentumScore || 0) >= 60;
      if (filter === 'watchlist') return watchlist.includes(t.address);
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_high': return b.price - a.price;
        case 'price_low':  return a.price - b.price;
        case 'volume':     return (b.volume24hUSD || 0) - (a.volume24hUSD || 0);
        case 'safety':     return (b.safetyScore || 0) - (a.safetyScore || 0);
        case 'momentum':   return (b.momentumScore || 0) - (a.momentumScore || 0);
        case 'change':     return (b.price24hChangePercent || 0) - (a.price24hChangePercent || 0);
        default: return 0;
      }
    });

  const topGainer  = trending.length > 0 ? [...trending].sort((a, b) => (b.price24hChangePercent||0) - (a.price24hChangePercent||0))[0] : null;
  const safeCount  = trending.filter(t => (t.safetyScore || 0) >= 70).length;
  const riskyCount = trending.filter(t => (t.safetyScore || 0) < 40).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {selectedToken && (
        <TokenModal token={selectedToken} onClose={() => setSelectedToken(null)}
          watchlist={watchlist} onWatchlistToggle={toggleWatchlist} />
      )}
      {showCompare && compareTokens.length === 2 && (
        <CompareModal tokens={compareTokens as [Token, Token]}
          onClose={() => { setShowCompare(false); setCompareTokens([]); }} />
      )}

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-cyan-500/20">
              ⚡
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">BirdRadar</h1>
              <p className="text-[10px] sm:text-xs font-medium text-zinc-500">Powered by Birdeye Data API</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {compareTokens.length > 0 && (
              <button onClick={() => compareTokens.length === 2 ? setShowCompare(true) : null}
                className="text-xs px-3 sm:px-4 py-2 rounded-xl font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95 transition-all">
                ⚔️ {compareTokens.length}/2
              </button>
            )}
            {lastUpdated && <span className="text-xs font-mono text-zinc-500 hidden lg:block">Updated: {lastUpdated}</span>}
            <button onClick={fetchData}
              className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-cyan-400 hover:border-cyan-500/30 active:scale-90 transition-all">
              <span className={spinning ? 'inline-block spin-once' : 'inline-block'}>↻</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SOLANA STATS ────────────────────────────────────────────────────── */}
      {solanaStats.solPrice > 0 && <SolanaStatsBar stats={solanaStats} trending={trending} />}

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/30 border-b border-zinc-800/80 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-4 sm:gap-6 text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">
          <span>🔥 <span className="text-zinc-200 font-bold ml-0.5">{trending.length}</span></span>
          <span>📊 <span className="text-zinc-200 font-bold ml-0.5">{newListings.length}</span></span>
          <span>🟢 <span className="text-emerald-400 font-bold ml-0.5">{safeCount}</span></span>
          <span>🔴 <span className="text-rose-400 font-bold ml-0.5">{riskyCount}</span></span>
          <span>🐋 <span className="text-cyan-400 font-bold ml-0.5">{whaleAlerts.length}</span></span>
          <span>★ <span className="text-yellow-400 font-bold ml-0.5">{watchlist.length}</span></span>
        </div>
      </div>

      {/* ── TOP GAINER BANNER ───────────────────────────────────────────────── */}
      {topGainer && !loading && (
        <div className="bg-gradient-to-r from-zinc-950 via-emerald-950/20 to-zinc-950 border-b border-emerald-900/30 cursor-pointer hover:bg-emerald-900/10 active:bg-emerald-900/15 banner-pulse transition-colors"
          onClick={() => setSelectedToken(topGainer)}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 text-xs">
            <span className="font-black text-yellow-500 flex items-center gap-1"><span>🏆</span> TOP GAINER</span>
            <span className="text-white font-bold">{topGainer.symbol}</span>
            <span className="font-mono font-bold text-emerald-400">+{(topGainer.price24hChangePercent || 0).toFixed(0)}%</span>
            <span className="text-zinc-500 hidden sm:block truncate max-w-xs">{topGainer.name}</span>
            <span className="ml-auto text-emerald-500 font-medium">Tap to view ↗</span>
          </div>
        </div>
      )}

      {/* ── WHALE ALERTS ────────────────────────────────────────────────────── */}
      {whaleAlerts.length > 0 && !loading && (
        <div className="border-b border-zinc-800/50 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <span className="text-lg">🐋</span>
              <h2 className="font-black text-white text-sm sm:text-base">Whale Alerts</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Vol {'>'} 100%
              </span>
            </div>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3">
              {whaleAlerts.map((token, i) => (
                <WhaleCard key={token.address + i} token={token} onClick={() => setSelectedToken(token)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* Fear & Greed + Top Movers */}
        {!loading && trending.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <FearGreedMeter tokens={trending} />
            <TopMovers tokens={trending} onSelect={setSelectedToken} />
          </div>
        )}

        <AlertLog alerts={alerts} />

        {compareTokens.length === 1 && (
          <div className="p-3 sm:p-4 rounded-xl mb-5 text-sm bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 flex items-center gap-3 card-enter card-enter-1">
            <span>⚔️</span>
            <span className="text-xs sm:text-sm"><strong>{compareTokens[0].symbol}</strong> selected — tap ⚔️ on another token to compare</span>
          </div>
        )}

        {filter === 'watchlist' && watchlist.length === 0 && (
          <div className="p-8 rounded-2xl mb-6 text-center bg-yellow-500/5 border border-yellow-500/20">
            <p className="text-4xl mb-3">★</p>
            <p className="text-white font-bold mb-1">No tokens in watchlist</p>
            <p className="text-zinc-500 text-sm">Tap the ★ on any token card to add it</p>
          </div>
        )}

        {/* ── SEARCH ──────────────────────────────────────────────────────── */}
        <div className="mb-4 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input type="text" placeholder="Search token symbol or name..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 sm:py-4 text-sm text-white placeholder-zinc-600 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-cyan-500 focus:bg-zinc-900 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.1)] transition-all" />
        </div>

        {/* ── TABS + FILTERS ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            {(['trending', 'new'] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setFilter('all'); }}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  activeTab === tab ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}>
                {tab === 'trending' ? '🔥 Trending' : '📊 Top Volume'}
              </button>
            ))}
          </div>

          {([
            { key: 'all',       label: 'All' },
            { key: 'safe',      label: '🟢 Safe' },
            { key: 'gainers',   label: '🚀 Gainers' },
            { key: 'momentum',  label: '⚡ Momentum' },
            { key: 'watchlist', label: `★ Watchlist${watchlist.length > 0 ? ` (${watchlist.length})` : ''}` },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                filter === key
                  ? key === 'watchlist' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30' : 'bg-zinc-100 text-zinc-900 shadow-md'
                  : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
              }`}>{label}
            </button>
          ))}
        </div>

        {/* ── SORT BAR ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1">
          <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0">Sort:</span>
          {([
            { key: 'default',    label: 'Default' },
            { key: 'change',     label: '📈 % Change' },
            { key: 'volume',     label: '💰 Volume' },
            { key: 'safety',     label: '🛡️ Safety' },
            { key: 'momentum',   label: '⚡ Momentum' },
            { key: 'price_high', label: '💲 Price ↑' },
            { key: 'price_low',  label: '💲 Price ↓' },
          ] as { key: SortType; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setSortBy(key)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 active:scale-95 ${
                sortBy === key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-zinc-700'
              }`}>{label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-xs font-medium text-zinc-500 mb-4 uppercase tracking-wider">
            Showing <span className="text-zinc-300 font-mono">{sortedFiltered.length}</span> tokens
            {filter !== 'all' && ' · filtered'}
            {search && ` · "${search}"`}
          </p>
        )}

        {/* ── TOKEN GRID ──────────────────────────────────────────────────── */}
        <div key={refreshKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {loading
            ? Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : sortedFiltered.length === 0
            ? (
              <div className="col-span-full text-center py-20 text-zinc-500 font-medium bg-zinc-900/20 rounded-3xl border border-zinc-800 border-dashed">
                No tokens match your filter
              </div>
            )
            : sortedFiltered.map((token, i) => (
              <TokenCard
                key={token.address + refreshKey}
                token={token} index={i}
                onClick={() => setSelectedToken(token)}
                onCompare={handleCompare}
                isCompareSelected={compareTokens.some(t => t.address === token.address)}
                watchlist={watchlist}
                onWatchlistToggle={toggleWatchlist}
              />
            ))
          }
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="mt-12 sm:mt-16 pb-8 text-center text-xs font-medium text-zinc-600">
          Built with <span className="text-zinc-400">Birdeye Data API</span> · Auto-refreshes every 60s · <span className="text-zinc-400">#BirdeyeAPI</span>
          <div className="mt-2 flex items-center justify-center gap-3 flex-wrap">
            <span className="text-zinc-600">Built by</span>
            <a href="https://portfolio-one-bice-xqt0376aiu.vercel.app" target="_blank" rel="noopener noreferrer"
              className="font-bold text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }}>
              Aditya Chotaliya
            </a>
            <a href="https://portfolio-one-bice-xqt0376aiu.vercel.app" target="_blank" rel="noopener noreferrer"
              className="text-zinc-500 hover:text-cyan-400 transition-colors">Portfolio ↗</a>
            <a href="https://github.com/adityachotaliya9299-jpg" target="_blank" rel="noopener noreferrer"
              className="text-zinc-500 hover:text-cyan-400 transition-colors">GitHub ↗</a>
          </div>
        </div>
      </div>
    </main>
  );
}