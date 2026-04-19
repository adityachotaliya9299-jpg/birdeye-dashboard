'use client';
import { useEffect, useState, useCallback } from 'react';

interface Token {
  address: string;
  symbol: string;
  name: string;
  price: number;
  volume24hUSD: number;
  v24hUSD?: number;
  price24hChangePercent: number;
  v24hChangePercent?: number;
  logoURI?: string;
  rank?: number;
  liquidity?: number;
  fdv?: number;
  marketcap?: number;
  mc?: number;
  safetyScore?: number;
  momentumScore?: number;
  riskReason?: string;
  volume24hChangePercent?: number;
}

function calcRiskScore(token: Token): { score: number; reason: string } {
  let score = 100;
  const reasons: string[] = [];
  const liq = token.liquidity || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const fdv = token.fdv || token.mc || token.marketcap || 0;
  const priceChange = Math.abs(token.price24hChangePercent || 0);
  const volChange = Math.abs(token.volume24hChangePercent || token.v24hChangePercent || 0);
  if (liq < 10000) { score -= 35; reasons.push('very low liquidity'); }
  else if (liq < 50000) { score -= 20; reasons.push('low liquidity'); }
  else if (liq < 200000) { score -= 10; reasons.push('moderate liquidity'); }
  if (liq > 0 && vol / liq > 100) { score -= 20; reasons.push('suspicious vol/liq ratio'); }
  if (priceChange > 5000) { score -= 30; reasons.push('extreme pump'); }
  else if (priceChange > 1000) { score -= 20; reasons.push('very high pump'); }
  else if (priceChange > 200) { score -= 10; reasons.push('high pump'); }
  if (fdv < 50000) { score -= 15; reasons.push('micro cap'); }
  else if (fdv < 200000) { score -= 8; reasons.push('small cap'); }
  if (volChange > 10000) { score -= 15; reasons.push('bot volume suspected'); }
  return { score: Math.max(0, Math.min(100, score)), reason: reasons.slice(0, 2).join(', ') || 'looks stable' };
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

function SafetyBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  const label = score >= 70 ? 'SAFE' : score >= 40 ? 'CAUTION' : 'RISKY';
  return (
    <span style={{ color, border: `1px solid ${color}`, fontSize: '10px' }}
      className="px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
      {label} {score}
    </span>
  );
}

function MomentumBar({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#4b5563';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#6b7280', fontSize: '10px' }}>Momentum</span>
        <span style={{ color }} className="font-bold text-xs">{score}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1f2937' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
    </div>
  );
}

function TokenCard({ token, onClick }: { token: Token; onClick: () => void }) {
  const isUp = (token.price24hChangePercent || 0) > 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const priceStr = token.price < 0.001 ? token.price.toExponential(2)
    : token.price < 1 ? token.price.toFixed(4) : token.price.toFixed(2);
  const safetyColor = (token.safetyScore || 0) >= 70 ? '#22c55e'
    : (token.safetyScore || 0) >= 40 ? '#eab308' : '#ef4444';

  return (
    <div onClick={onClick} className="rounded-xl p-4 cursor-pointer transition-all duration-300 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #0f1117 0%, #141820 100%)',
        border: '1px solid #1f2937',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = `1px solid ${safetyColor}44`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${safetyColor}22`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = '1px solid #1f2937';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol}
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ border: `2px solid ${safetyColor}44` }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: `${safetyColor}22`, color: safetyColor, border: `2px solid ${safetyColor}44` }}>
              {token.symbol?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{token.symbol}</p>
            <p className="truncate" style={{ color: '#6b7280', fontSize: '11px', maxWidth: '90px' }}>{token.name}</p>
          </div>
        </div>
        {token.safetyScore !== undefined && <SafetyBadge score={token.safetyScore} />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white font-mono text-base font-bold">${priceStr}</p>
          <p style={{ color: '#4b5563', fontSize: '11px' }} className="mt-0.5">
            Vol: ${(vol / 1_000_000).toFixed(2)}M
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold" style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
            {isUp ? '▲' : '▼'} {Math.abs(token.price24hChangePercent || 0).toFixed(2)}%
          </span>
          {token.liquidity && (
            <p style={{ color: '#374151', fontSize: '10px' }}>
              Liq: ${(token.liquidity / 1000).toFixed(0)}K
            </p>
          )}
        </div>
      </div>
      {token.momentumScore !== undefined && <MomentumBar score={token.momentumScore} />}
    </div>
  );
}

function WhaleCard({ token, onClick }: { token: Token; onClick: () => void }) {
  const volChange = token.volume24hChangePercent || token.v24hChangePercent || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  return (
    <div onClick={onClick}
      className="flex-shrink-0 rounded-xl p-3 cursor-pointer transition-all duration-300 hover:scale-105"
      style={{
        background: 'linear-gradient(135deg, #0f1e0f 0%, #0a1a1a 100%)',
        border: '1px solid #22c55e44',
        boxShadow: '0 0 20px #22c55e11',
        width: '200px',
      }}>
      <div className="flex items-center gap-2 mb-2">
        {token.logoURI && (
          <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <span className="font-bold text-white text-sm">{token.symbol}</span>
        <span className="ml-auto text-xs font-bold" style={{ color: '#22c55e' }}>🐋</span>
      </div>
      <p className="font-bold text-sm" style={{ color: '#22c55e' }}>
        +{volChange.toFixed(0)}% vol
      </p>
      <p style={{ color: '#6b7280', fontSize: '11px' }}>
        ${(vol / 1_000_000).toFixed(2)}M traded
      </p>
      <p className="font-mono text-white text-xs mt-1">
        ${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}
      </p>
    </div>
  );
}

function TokenModal({ token, onClose }: { token: Token; onClose: () => void }) {
  const isUp = (token.price24hChangePercent || 0) > 0;
  const fdv = token.fdv || token.mc || token.marketcap || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const safetyColor = (token.safetyScore || 0) >= 70 ? '#22c55e'
    : (token.safetyScore || 0) >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="rounded-2xl p-6 max-w-md w-full"
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
          border: `1px solid ${safetyColor}66`,
          boxShadow: `0 0 40px ${safetyColor}22`,
        }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {token.logoURI && (
              <img src={token.logoURI} alt={token.symbol}
                className="w-12 h-12 rounded-full"
                style={{ border: `2px solid ${safetyColor}66` }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{token.symbol}</h2>
              <p style={{ color: '#6b7280' }} className="text-sm">{token.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl leading-none transition-colors hover:text-white"
            style={{ color: '#4b5563' }}>×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Price', value: `$${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}` },
            { label: '24h Change', value: `${isUp ? '+' : ''}${(token.price24hChangePercent || 0).toFixed(2)}%`, color: isUp ? '#22c55e' : '#ef4444' },
            { label: 'Volume 24h', value: `$${(vol / 1_000_000).toFixed(2)}M` },
            { label: 'Liquidity', value: token.liquidity ? `$${(token.liquidity / 1000).toFixed(0)}K` : 'N/A' },
            { label: 'FDV / MCap', value: fdv ? `$${(fdv / 1_000_000).toFixed(2)}M` : 'N/A' },
            { label: 'Vol Change', value: token.v24hChangePercent ? `${token.v24hChangePercent.toFixed(1)}%` : 'N/A' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg p-3" style={{ background: '#0d1117', border: '1px solid #1f2937' }}>
              <p style={{ color: '#4b5563', fontSize: '11px' }} className="mb-1">{label}</p>
              <p className="font-mono text-sm font-bold" style={color ? { color } : { color: '#e5e7eb' }}>{value}</p>
            </div>
          ))}
        </div>

        {token.safetyScore !== undefined && (
          <div className="rounded-lg p-3 mb-4" style={{ background: '#0d1117', border: `1px solid ${safetyColor}33` }}>
            <div className="flex justify-between items-center mb-2">
              <span style={{ color: '#9ca3af' }} className="text-sm">Risk Analysis</span>
              <SafetyBadge score={token.safetyScore} />
            </div>
            <p style={{ color: '#6b7280', fontSize: '11px' }} className="mb-2">{token.riskReason}</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1f2937' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${token.safetyScore}%`, background: `linear-gradient(90deg, ${safetyColor}88, ${safetyColor})` }} />
            </div>
          </div>
        )}

        <p style={{ color: '#374151', fontSize: '10px' }} className="break-all mb-3">{token.address}</p>

        <button
          onClick={() => window.open(`https://birdeye.so/token/${token.address}?chain=solana`, '_blank')}
          className="w-full font-bold py-2.5 rounded-lg transition-all text-sm hover:opacity-90"
          style={{ background: `linear-gradient(90deg, ${safetyColor}cc, ${safetyColor})`, color: '#000' }}>
          View on Birdeye ↗
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ background: '#0f1117', border: '1px solid #1f2937' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: '#1f2937' }} />
        <div className="flex-1">
          <div className="h-3 w-16 rounded mb-1" style={{ background: '#1f2937' }} />
          <div className="h-2 w-24 rounded" style={{ background: '#1f2937' }} />
        </div>
      </div>
      <div className="h-5 w-20 rounded mb-1" style={{ background: '#1f2937' }} />
      <div className="h-3 w-28 rounded mb-2" style={{ background: '#1f2937' }} />
      <div className="h-1 rounded-full" style={{ background: '#1f2937' }} />
    </div>
  );
}

type FilterType = 'all' | 'safe' | 'gainers' | 'momentum';

export default function Dashboard() {
  const [trending, setTrending] = useState<Token[]>([]);
  const [newListings, setNewListings] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'new'>('trending');
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastUpdated, setLastUpdated] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [search, setSearch] = useState('');

  const enrichTokens = (tokens: Token[]): Token[] =>
    tokens.map(token => {
      const { score, reason } = calcRiskScore(token);
      return { ...token, safetyScore: score, momentumScore: calcMomentum(token), riskReason: reason };
    });

  const fetchData = useCallback(async () => {
    setSpinning(true);
    setLoading(true);
    try {
      const [trendRes, newRes] = await Promise.all([fetch('/api/trending'), fetch('/api/new-listings')]);
      const trendData = await trendRes.json();
      const newData = await newRes.json();
      setTrending(enrichTokens(trendData?.data?.tokens || []));
      setNewListings(enrichTokens((newData?.data?.tokens || []).slice(0, 20)));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) { console.error(err); }
    setLoading(false);
    setTimeout(() => setSpinning(false), 500);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Whale alerts: tokens with volume change > 300%
  const whaleAlerts = trending
    .filter(t => (t.volume24hChangePercent || t.v24hChangePercent || 0) > 100 && (t.volume24hUSD || 0) > 10000)
    .sort((a, b) => (b.v24hChangePercent || 0) - (a.v24hChangePercent || 0))
    .slice(0, 8);

  const baseTokens = activeTab === 'trending' ? trending : newListings;
  const filtered = baseTokens
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.symbol?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q);
    })
    .filter(t => {
      if (filter === 'safe') return (t.safetyScore || 0) >= 70;
      if (filter === 'gainers') return (t.price24hChangePercent || 0) > 50;
      if (filter === 'momentum') return (t.momentumScore || 0) >= 60;
      return true;
    });

  const topGainer = trending.length > 0
    ? [...trending].sort((a, b) => (b.price24hChangePercent || 0) - (a.price24hChangePercent || 0))[0]
    : null;
  const safeCount = trending.filter(t => (t.safetyScore || 0) >= 70).length;
  const riskyCount = trending.filter(t => (t.safetyScore || 0) < 40).length;

  return (
    <main className="min-h-screen text-white" style={{ background: '#080b10', fontFamily: 'monospace' }}>
      {selectedToken && <TokenModal token={selectedToken} onClose={() => setSelectedToken(null)} />}

      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sticky top-0 z-10"
        style={{ background: 'rgba(8,11,16,0.95)', borderBottom: '1px solid #1f2937', backdropFilter: 'blur(10px)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-black font-bold text-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>⚡</div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">BirdRadar</h1>
              <p className="text-xs hidden sm:block" style={{ color: '#4b5563' }}>Powered by Birdeye Data API</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs hidden sm:block" style={{ color: '#374151' }}>Updated: {lastUpdated}</span>}
            <button onClick={fetchData}
              className="p-2 rounded-lg transition text-lg"
              style={{ color: '#4b5563' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#06b6d4'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4b5563'}>
              <span className={spinning ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 sm:px-6 py-2" style={{ background: '#0a0e14', borderBottom: '1px solid #1f2937' }}>
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 text-xs" style={{ color: '#6b7280' }}>
          <span>🔥 Trending: <span className="text-white font-bold">{trending.length}</span></span>
          <span>📊 Top Vol: <span className="text-white font-bold">{newListings.length}</span></span>
          <span>🟢 Safe: <span className="font-bold" style={{ color: '#22c55e' }}>{safeCount}</span></span>
          <span>🔴 Risky: <span className="font-bold" style={{ color: '#ef4444' }}>{riskyCount}</span></span>
          <span>🐋 Whale Alerts: <span className="font-bold" style={{ color: '#06b6d4' }}>{whaleAlerts.length}</span></span>
          <span className="ml-auto hidden sm:block" style={{ color: '#1f2937' }}>#BirdeyeAPI</span>
        </div>
      </div>

      {/* Top Gainer Banner */}
      {topGainer && !loading && (
        <div className="px-4 sm:px-6 py-2 cursor-pointer transition-all"
          style={{ background: 'linear-gradient(90deg, #0a0e14, #0d1f0d, #0a0e14)', borderBottom: '1px solid #14532d44' }}
          onClick={() => setSelectedToken(topGainer)}>
          <div className="max-w-6xl mx-auto flex items-center gap-3 text-xs">
            <span className="font-bold" style={{ color: '#fbbf24' }}>🏆 TOP GAINER</span>
            <span className="text-white font-bold">{topGainer.symbol}</span>
            <span className="font-bold" style={{ color: '#22c55e' }}>+{(topGainer.price24hChangePercent || 0).toFixed(0)}%</span>
            <span style={{ color: '#4b5563' }}>{topGainer.name}</span>
            <span className="ml-auto" style={{ color: '#374151' }}>click to view →</span>
          </div>
        </div>
      )}

      {/* 🐋 WHALE ALERTS SECTION */}
      {whaleAlerts.length > 0 && !loading && (
        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #1f2937', background: '#090d12' }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🐋</span>
              <h2 className="font-bold text-white text-sm">Whale Alerts</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>
                Volume Spike {'>'} 300%
              </span>
              <span className="text-xs ml-2" style={{ color: '#4b5563' }}>scroll →</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {whaleAlerts.map((token, i) => (
                <WhaleCard key={token.address + i} token={token} onClick={() => setSelectedToken(token)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="mb-4">
          <input type="text" placeholder="🔍  Search token symbol or name..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 text-sm text-white placeholder-gray-600 rounded-lg focus:outline-none transition-all"
            style={{ background: '#0d1117', border: '1px solid #1f2937' }}
            onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#06b6d4'}
            onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#1f2937'}
          />
        </div>

        {/* Tabs + Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['trending', 'new'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setFilter('all'); }}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={activeTab === tab
                ? { background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', color: '#000' }
                : { background: '#0d1117', color: '#6b7280', border: '1px solid #1f2937' }}>
              {tab === 'trending' ? '🔥 Trending' : '📊 Top Volume'}
            </button>
          ))}

          <div className="w-px mx-1 self-stretch hidden sm:block" style={{ background: '#1f2937' }} />

          {([
            { key: 'all', label: 'All' },
            { key: 'safe', label: '🟢 Safe Only' },
            { key: 'gainers', label: '🚀 >50% Gainers' },
            { key: 'momentum', label: '⚡ High Momentum' },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={filter === key
                ? { background: '#1f2937', color: '#e5e7eb' }
                : { color: '#4b5563' }}>
              {label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-xs mb-3" style={{ color: '#374151' }}>
            Showing {filtered.length} token{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && ' (filtered)'}{search && ` matching "${search}"`}
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading
            ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
            ? <div className="col-span-full text-center py-16" style={{ color: '#374151' }}>No tokens match your filter</div>
            : filtered.map((token, i) => (
              <TokenCard key={token.address + i} token={token} onClick={() => setSelectedToken(token)} />
            ))
          }
        </div>

        <div className="mt-10 pb-4 text-center text-xs" style={{ color: '#1f2937' }}>
          Built with <span style={{ color: '#164e63' }}>Birdeye Data API</span> • Auto-refreshes every 60s • <span style={{ color: '#164e63' }}>#BirdeyeAPI</span>
        </div>
      </div>
    </main>
  );
}
