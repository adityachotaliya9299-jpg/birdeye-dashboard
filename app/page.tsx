'use client';
import { useEffect, useState, useCallback } from 'react';

interface Token {
  address: string;
  symbol: string;
  name: string;
  price: number;
  volume24hUSD: number;
  price24hChangePercent: number;
  v24hChangePercent?: number;
  logoURI?: string;
  rank?: number;
  liquidity?: number;
  fdv?: number;
  marketcap?: number;
  v24hUSD?: number;
  mc?: number;
  safetyScore?: number;
  momentumScore?: number;
  riskReason?: string;
}

// Smart risk score from token data we already have (no extra API needed)
function calcRiskScore(token: Token): { score: number; reason: string } {
  let score = 100;
  const reasons: string[] = [];

  const liq = token.liquidity || 0;
  const vol = token.volume24hUSD || 0;
  const fdv = token.fdv || token.mc || token.marketcap || 0;
  const priceChange = Math.abs(token.price24hChangePercent || 0);
  const volChange = Math.abs(token.v24hChangePercent || 0);

  // Low liquidity = high rug risk
  if (liq < 10000) { score -= 35; reasons.push('very low liquidity'); }
  else if (liq < 50000) { score -= 20; reasons.push('low liquidity'); }
  else if (liq < 200000) { score -= 10; reasons.push('moderate liquidity'); }

  // Suspicious vol/liquidity ratio (wash trading signal)
  if (liq > 0 && vol / liq > 100) { score -= 20; reasons.push('suspicious vol/liq ratio'); }

  // Extreme price pump = dump risk
  if (priceChange > 5000) { score -= 30; reasons.push('extreme pump'); }
  else if (priceChange > 1000) { score -= 20; reasons.push('very high pump'); }
  else if (priceChange > 200) { score -= 10; reasons.push('high pump'); }

  // Very low FDV = micro cap risk
  if (fdv < 50000) { score -= 15; reasons.push('micro cap'); }
  else if (fdv < 200000) { score -= 8; reasons.push('small cap'); }

  // Extreme volume change = bot activity
  if (volChange > 10000) { score -= 15; reasons.push('bot volume suspected'); }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: reasons.slice(0, 2).join(', ') || 'looks stable'
  };
}

// Momentum score: combines price + volume action
function calcMomentum(token: Token): number {
  const priceChange = token.price24hChangePercent || 0;
  const volChange = token.v24hChangePercent || 0;
  const liq = token.liquidity || 1;

  // Positive momentum only
  if (priceChange <= 0) return 0;

  let score = 0;
  score += Math.min(40, priceChange / 100 * 10);  // price contribution max 40
  score += Math.min(30, Math.max(0, volChange) / 100 * 8); // vol contribution max 30
  score += Math.min(30, Math.log10(liq + 1) * 5); // liquidity depth max 30

  return Math.min(100, Math.round(score));
}

function SafetyBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  const label = score >= 70 ? 'SAFE' : score >= 40 ? 'CAUTION' : 'RISKY';
  return (
    <span style={{ color, border: `1px solid ${color}` }}
      className="text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
      {label} {score}
    </span>
  );
}

function MomentumBar({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#6b7280';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">Momentum</span>
        <span style={{ color }} className="font-bold">{score}</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function TokenCard({ token, onClick }: { token: Token; onClick: () => void }) {
  const isUp = (token.price24hChangePercent || 0) > 0;
  const priceStr = token.price < 0.001
    ? token.price.toExponential(2)
    : token.price < 1
    ? token.price.toFixed(4)
    : token.price.toFixed(2);
  

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-cyan-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer active:scale-95"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol}
              className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-cyan-900 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
              {token.symbol?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{token.symbol}</p>
            <p className="text-gray-500 text-xs truncate max-w-[90px]">{token.name}</p>
          </div>
        </div>
        {token.safetyScore !== undefined && <SafetyBadge score={token.safetyScore} />}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-white font-mono text-base">${priceStr}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Vol: ${(((token.volume24hUSD || token.v24hUSD || 0) as number) / 1_000_000).toFixed(2)}M
          </p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(token.price24hChangePercent || 0).toFixed(2)}%
          </span>
          {token.liquidity && (
            <p className="text-gray-600 text-xs">
              Liq: ${(token.liquidity / 1000).toFixed(0)}K
            </p>
          )}
        </div>
      </div>

      {token.momentumScore !== undefined && <MomentumBar score={token.momentumScore} />}
    </div>
  );
}

function TokenModal({ token, onClose }: { token: Token; onClose: () => void }) {
  if (!token) return null;
  const isUp = (token.price24hChangePercent || 0) > 0;
  const fdv = token.fdv || token.mc || token.marketcap || 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-cyan-500 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-cyan-500/20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {token.logoURI && (
              <img src={token.logoURI} alt={token.symbol} className="w-12 h-12 rounded-full"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{token.symbol}</h2>
              <p className="text-gray-400 text-sm">{token.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Price', value: `$${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}` },
            { label: '24h Change', value: `${isUp ? '+' : ''}${(token.price24hChangePercent || 0).toFixed(2)}%`, color: isUp ? '#22c55e' : '#ef4444' },
            { label: 'Volume 24h', value: `$${((token.volume24hUSD || 0) / 1_000_000).toFixed(2)}M` },
            { label: 'Liquidity', value: token.liquidity ? `$${(token.liquidity / 1000).toFixed(0)}K` : 'N/A' },
            { label: 'FDV / MCap', value: fdv ? `$${(fdv / 1_000_000).toFixed(2)}M` : 'N/A' },
            { label: 'Vol Change', value: token.v24hChangePercent ? `${token.v24hChangePercent.toFixed(1)}%` : 'N/A' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className="text-white font-mono text-sm font-bold" style={color ? { color } : {}}>{value}</p>
            </div>
          ))}
        </div>

        {token.safetyScore !== undefined && (
          <div className="bg-gray-800 rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Risk Analysis</span>
              <SafetyBadge score={token.safetyScore} />
            </div>
            <p className="text-gray-500 text-xs">{token.riskReason}</p>
            <div className="h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${token.safetyScore}%`,
                  backgroundColor: token.safetyScore >= 70 ? '#22c55e' : token.safetyScore >= 40 ? '#eab308' : '#ef4444'
                }} />
            </div>
          </div>
        )}

        <div className="text-xs text-gray-600 break-all">
          {token.address}
        </div>

        
          <button
  onClick={() => window.open(`https://birdeye.so/token/${token.address}?chain=solana`, '_blank')}
  className="mt-3 w-full text-center bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 rounded-lg transition text-sm"
>
  View on Birdeye ↗
</button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 w-16 bg-gray-800 rounded mb-1" />
          <div className="h-2 w-24 bg-gray-800 rounded" />
        </div>
      </div>
      <div className="h-5 w-20 bg-gray-800 rounded mb-1" />
      <div className="h-3 w-28 bg-gray-800 rounded mb-2" />
      <div className="h-1 bg-gray-800 rounded-full" />
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

  const enrichTokens = (tokens: Token[]): Token[] => {
    return tokens.map(token => {
      const { score, reason } = calcRiskScore(token);
      const momentumScore = calcMomentum(token);
      return { ...token, safetyScore: score, momentumScore, riskReason: reason };
    });
  };

  const fetchData = useCallback(async () => {
    setSpinning(true);
    setLoading(true);
    try {
      const [trendRes, newRes] = await Promise.all([
        fetch('/api/trending'),
        fetch('/api/new-listings'),
      ]);
      const trendData = await trendRes.json();
      const newData = await newRes.json();

      const trendTokens: Token[] = trendData?.data?.tokens || [];
      const newTokens: Token[] = newData?.data?.tokens || [];

      setTrending(enrichTokens(trendTokens));
      setNewListings(enrichTokens(newTokens.slice(0, 20)));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
    setTimeout(() => setSpinning(false), 500);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const baseTokens = activeTab === 'trending' ? trending : newListings;

  const filtered = baseTokens
    .filter(t => {
      if (search) {
        const q = search.toLowerCase();
        return t.symbol?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q);
      }
      return true;
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
    <main className="min-h-screen bg-black text-white" style={{ fontFamily: 'monospace' }}>
      {selectedToken && (
        <TokenModal token={selectedToken} onClose={() => setSelectedToken(null)} />
      )}

      {/* Header */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-4 sticky top-0 bg-black z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center text-black font-bold text-lg flex-shrink-0">⚡</div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">BirdRadar</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Powered by Birdeye Data API</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-600 hidden sm:block">Updated: {lastUpdated}</span>
            )}
            <button onClick={fetchData}
              className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-cyan-400 text-lg">
              <span className={spinning ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-950 border-b border-gray-800 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 sm:gap-6 text-xs text-gray-400">
          <span>🔥 Trending: <span className="text-white font-bold">{trending.length}</span></span>
          <span>📋 Top Vol: <span className="text-white font-bold">{newListings.length}</span></span>
          <span>🟢 Safe: <span className="text-green-400 font-bold">{safeCount}</span></span>
          <span>🔴 Risky: <span className="text-red-400 font-bold">{riskyCount}</span></span>
          <span className="ml-auto text-gray-700 hidden sm:block">#BirdeyeAPI</span>
        </div>
      </div>

      {/* Top Gainer Banner */}
      {topGainer && !loading && (
        <div
          className="bg-gradient-to-r from-gray-950 via-green-950/20 to-gray-950 border-b border-green-900/30 px-4 sm:px-6 py-2 cursor-pointer hover:from-gray-900"
          onClick={() => setSelectedToken(topGainer)}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3 text-xs">
            <span className="text-yellow-400 font-bold">🏆 TOP GAINER</span>
            <span className="text-white font-bold">{topGainer.symbol}</span>
            <span className="text-green-400 font-bold">+{(topGainer.price24hChangePercent || 0).toFixed(0)}%</span>
            <span className="text-gray-500">{topGainer.name}</span>
            <span className="text-gray-600 ml-auto">click to view →</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search token symbol or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Tabs + Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['trending', 'new'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setFilter('all'); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab ? 'bg-cyan-500 text-black' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
              }`}>
              {tab === 'trending' ? '🔥 Trending' : '📊 Top Volume'}
            </button>
          ))}

          <div className="h-8 w-px bg-gray-800 self-center mx-1 hidden sm:block" />

          {([
            { key: 'all', label: 'All' },
            { key: 'safe', label: '🟢 Safe Only' },
            { key: 'gainers', label: '🚀 >50% Gainers' },
            { key: 'momentum', label: '⚡ High Momentum' },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === key ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-xs text-gray-600 mb-3">
            Showing {filtered.length} token{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && ` (filtered)`}
            {search && ` matching "${search}"`}
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading
            ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
            ? (
              <div className="col-span-full text-center py-16 text-gray-600">
                No tokens match your filter
              </div>
            )
            : filtered.map((token, i) => (
              <TokenCard key={token.address + i} token={token} onClick={() => setSelectedToken(token)} />
            ))
          }
        </div>

        {/* Footer */}
        <div className="mt-10 pb-4 text-center text-xs text-gray-700">
          Built with <span className="text-cyan-800">Birdeye Data API</span> • Auto-refreshes every 60s • <span className="text-cyan-800">#BirdeyeAPI</span>
        </div>
      </div>
    </main>
  );
}
