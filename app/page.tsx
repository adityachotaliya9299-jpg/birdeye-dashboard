// 'use client';
// import { useEffect, useState, useCallback, useRef } from 'react';
// import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

// interface Token {
//   address: string;
//   symbol: string;
//   name: string;
//   price: number;
//   volume24hUSD: number;
//   v24hUSD?: number;
//   price24hChangePercent: number;
//   v24hChangePercent?: number;
//   volume24hChangePercent?: number;
//   logoURI?: string;
//   rank?: number;
//   liquidity?: number;
//   fdv?: number;
//   marketcap?: number;
//   mc?: number;
//   safetyScore?: number;
//   momentumScore?: number;
//   riskReason?: string;
// }

// interface Alert {
//   token: Token;
//   time: string;
//   type: 'whale' | 'breakout';
// }

// function calcRiskScore(token: Token): { score: number; reason: string } {
//   let score = 100;
//   const reasons: string[] = [];
//   const liq = token.liquidity || 0;
//   const vol = token.volume24hUSD || token.v24hUSD || 0;
//   const fdv = token.fdv || token.mc || token.marketcap || 0;
//   const priceChange = Math.abs(token.price24hChangePercent || 0);
//   const volChange = Math.abs(token.volume24hChangePercent || token.v24hChangePercent || 0);
//   if (liq < 10000) { score -= 35; reasons.push('very low liquidity'); }
//   else if (liq < 50000) { score -= 20; reasons.push('low liquidity'); }
//   else if (liq < 200000) { score -= 10; reasons.push('moderate liquidity'); }
//   if (liq > 0 && vol / liq > 100) { score -= 20; reasons.push('suspicious vol/liq ratio'); }
//   if (priceChange > 5000) { score -= 30; reasons.push('extreme pump'); }
//   else if (priceChange > 1000) { score -= 20; reasons.push('very high pump'); }
//   else if (priceChange > 200) { score -= 10; reasons.push('high pump'); }
//   if (fdv < 50000) { score -= 15; reasons.push('micro cap'); }
//   else if (fdv < 200000) { score -= 8; reasons.push('small cap'); }
//   if (volChange > 10000) { score -= 15; reasons.push('bot volume suspected'); }
//   return { score: Math.max(0, Math.min(100, score)), reason: reasons.slice(0, 2).join(', ') || 'looks stable' };
// }

// function calcMomentum(token: Token): number {
//   const priceChange = token.price24hChangePercent || 0;
//   const volChange = token.volume24hChangePercent || token.v24hChangePercent || 0;
//   const liq = token.liquidity || 1;
//   if (priceChange <= 0) return 0;
//   let score = 0;
//   score += Math.min(40, priceChange / 100 * 10);
//   score += Math.min(30, Math.max(0, volChange) / 100 * 8);
//   score += Math.min(30, Math.log10(liq + 1) * 5);
//   return Math.min(100, Math.round(score));
// }

// function calcFearGreed(tokens: Token[]): { score: number; label: string; color: string } {
//   if (tokens.length === 0) return { score: 50, label: 'Neutral', color: '#eab308' };
//   const avgChange = tokens.reduce((sum, t) => sum + (t.price24hChangePercent || 0), 0) / tokens.length;
//   const gainers = tokens.filter(t => (t.price24hChangePercent || 0) > 0).length;
//   const greedRatio = gainers / tokens.length;
//   const avgSafety = tokens.reduce((sum, t) => sum + (t.safetyScore || 50), 0) / tokens.length;
//   let score = 50;
//   score += Math.min(25, avgChange / 100 * 5);
//   score += (greedRatio - 0.5) * 30;
//   score += (avgSafety - 50) * 0.3;
//   score = Math.max(0, Math.min(100, Math.round(score)));
//   const label = score >= 75 ? 'Extreme Greed' : score >= 60 ? 'Greed' : score >= 40 ? 'Neutral' : score >= 25 ? 'Fear' : 'Extreme Fear';
//   const color = score >= 75 ? '#22c55e' : score >= 60 ? '#84cc16' : score >= 40 ? '#eab308' : score >= 25 ? '#f97316' : '#ef4444';
//   return { score, label, color };
// }

// function SafetyBadge({ score }: { score: number }) {
//   const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
//   const label = score >= 70 ? 'SAFE' : score >= 40 ? 'CAUTION' : 'RISKY';
//   return (
//     <span style={{ color, border: `1px solid ${color}`, fontSize: '10px' }}
//       className="px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
//       {label} {score}
//     </span>
//   );
// }

// function MomentumBar({ score }: { score: number }) {
//   const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#4b5563';
//   return (
//     <div className="mt-2">
//       <div className="flex justify-between text-xs mb-1">
//         <span style={{ color: '#6b7280', fontSize: '10px' }}>Momentum</span>
//         <span style={{ color }} className="font-bold text-xs">{score}</span>
//       </div>
//       <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1f2937' }}>
//         <div className="h-full rounded-full transition-all duration-700"
//           style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
//       </div>
//     </div>
//   );
// }

// // Fear & Greed Meter
// function FearGreedMeter({ tokens }: { tokens: Token[] }) {
//   const { score, label, color } = calcFearGreed(tokens);
//   const circumference = 2 * Math.PI * 40;
//   const progress = (score / 100) * circumference;

//   return (
//     <div className="rounded-xl p-4 flex items-center gap-4"
//       style={{ background: 'linear-gradient(135deg, #0d1117, #141820)', border: '1px solid #1f2937' }}>
//       <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
//         <svg width="80" height="80" viewBox="0 0 100 100">
//           <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
//           <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
//             strokeDasharray={`${progress} ${circumference}`}
//             strokeLinecap="round"
//             transform="rotate(-90 50 50)"
//             style={{ transition: 'stroke-dasharray 1s ease' }} />
//         </svg>
//         <div className="absolute inset-0 flex items-center justify-center">
//           <span className="font-bold text-white text-lg">{score}</span>
//         </div>
//       </div>
//       <div>
//         <p style={{ color: '#6b7280', fontSize: '11px' }} className="mb-1">Market Sentiment</p>
//         <p className="font-bold text-xl" style={{ color }}>{label}</p>
//         <p style={{ color: '#4b5563', fontSize: '11px' }} className="mt-1">
//           Based on {tokens.length} trending tokens
//         </p>
//       </div>
//     </div>
//   );
// }

// // Top Movers Summary
// function TopMovers({ tokens, onSelect }: { tokens: Token[]; onSelect: (t: Token) => void }) {
//   if (tokens.length === 0) return null;
//   const topGainers = [...tokens].sort((a, b) => (b.price24hChangePercent || 0) - (a.price24hChangePercent || 0)).slice(0, 3);
//   const topVolume = [...tokens].sort((a, b) => (b.volume24hChangePercent || 0) - (a.volume24hChangePercent || 0)).slice(0, 3);
//   const topSafe = [...tokens].filter(t => (t.safetyScore || 0) >= 70).sort((a, b) => (b.safetyScore || 0) - (a.safetyScore || 0)).slice(0, 3);

//   const Section = ({ title, emoji, items, valueKey, valueFormat, color }: any) => (
//     <div className="flex-1 min-w-0">
//       <p className="text-xs font-bold mb-2" style={{ color: '#6b7280' }}>{emoji} {title}</p>
//       <div className="space-y-1.5">
//         {items.map((token: Token, i: number) => (
//           <div key={token.address} onClick={() => onSelect(token)}
//             className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all hover:scale-105"
//             style={{ background: '#0d1117', border: '1px solid #1f2937' }}>
//             <span style={{ color: '#4b5563', fontSize: '10px' }}>#{i + 1}</span>
//             {token.logoURI && (
//               <img src={token.logoURI} alt={token.symbol} className="w-4 h-4 rounded-full flex-shrink-0"
//                 onError={(e) => { e.currentTarget.style.display = 'none'; }} />
//             )}
//             <span className="text-white font-bold text-xs truncate flex-1">{token.symbol}</span>
//             <span className="font-bold text-xs whitespace-nowrap" style={{ color }}>
//               {valueFormat(token)}
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );

//   return (
//     <div className="rounded-xl p-4 mb-4"
//       style={{ background: 'linear-gradient(135deg, #0d1117, #141820)', border: '1px solid #1f2937' }}>
//       <p className="text-sm font-bold text-white mb-3">📊 Top Movers</p>
//       <div className="flex gap-3">
//         <Section title="Gainers" emoji="🚀" items={topGainers} color="#22c55e"
//           valueFormat={(t: Token) => `+${(t.price24hChangePercent || 0).toFixed(0)}%`} />
//         <div className="w-px" style={{ background: '#1f2937' }} />
//         <Section title="Vol Spike" emoji="🐋" items={topVolume} color="#06b6d4"
//           valueFormat={(t: Token) => `+${((t.volume24hChangePercent || 0)).toFixed(0)}%`} />
//         <div className="w-px" style={{ background: '#1f2937' }} />
//         <Section title="Safest" emoji="🛡️" items={topSafe} color="#22c55e"
//           valueFormat={(t: Token) => `${t.safetyScore}/100`} />
//       </div>
//     </div>
//   );
// }

// // Token Comparison
// function CompareModal({ tokens, onClose }: { tokens: [Token, Token]; onClose: () => void }) {
//   const [a, b] = tokens;
//   const metrics = [
//     { label: 'Price', aVal: `$${a.price < 0.001 ? a.price.toExponential(2) : a.price.toFixed(4)}`, bVal: `$${b.price < 0.001 ? b.price.toExponential(2) : b.price.toFixed(4)}`, winner: null },
//     { label: '24h Change', aVal: `${(a.price24hChangePercent || 0).toFixed(1)}%`, bVal: `${(b.price24hChangePercent || 0).toFixed(1)}%`, winner: (a.price24hChangePercent || 0) > (b.price24hChangePercent || 0) ? 'a' : 'b' },
//     { label: 'Volume', aVal: `$${((a.volume24hUSD || 0) / 1e6).toFixed(2)}M`, bVal: `$${((b.volume24hUSD || 0) / 1e6).toFixed(2)}M`, winner: (a.volume24hUSD || 0) > (b.volume24hUSD || 0) ? 'a' : 'b' },
//     { label: 'Safety Score', aVal: `${a.safetyScore}/100`, bVal: `${b.safetyScore}/100`, winner: (a.safetyScore || 0) > (b.safetyScore || 0) ? 'a' : 'b' },
//     { label: 'Momentum', aVal: `${a.momentumScore}/100`, bVal: `${b.momentumScore}/100`, winner: (a.momentumScore || 0) > (b.momentumScore || 0) ? 'a' : 'b' },
//     { label: 'Liquidity', aVal: `$${((a.liquidity || 0) / 1000).toFixed(0)}K`, bVal: `$${((b.liquidity || 0) / 1000).toFixed(0)}K`, winner: (a.liquidity || 0) > (b.liquidity || 0) ? 'a' : 'b' },
//   ];

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
//       style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
//       onClick={onClose}>
//       <div className="rounded-2xl p-6 max-w-lg w-full"
//         style={{ background: 'linear-gradient(135deg, #0d1117, #161b22)', border: '1px solid #06b6d444', boxShadow: '0 0 40px #06b6d422' }}
//         onClick={e => e.stopPropagation()}>
//         <div className="flex items-center justify-between mb-5">
//           <h2 className="text-lg font-bold text-white">⚔️ Token Comparison</h2>
//           <button onClick={onClose} className="text-2xl leading-none" style={{ color: '#4b5563' }}>×</button>
//         </div>

//         {/* Headers */}
//         <div className="grid grid-cols-3 gap-3 mb-4">
//           <div className="rounded-lg p-3 text-center" style={{ background: '#0d1117', border: '1px solid #22c55e44' }}>
//             {a.logoURI && <img src={a.logoURI} alt={a.symbol} className="w-8 h-8 rounded-full mx-auto mb-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
//             <p className="font-bold text-white text-sm">{a.symbol}</p>
//           </div>
//           <div className="flex items-center justify-center">
//             <span className="text-2xl">⚡</span>
//           </div>
//           <div className="rounded-lg p-3 text-center" style={{ background: '#0d1117', border: '1px solid #3b82f644' }}>
//             {b.logoURI && <img src={b.logoURI} alt={b.symbol} className="w-8 h-8 rounded-full mx-auto mb-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
//             <p className="font-bold text-white text-sm">{b.symbol}</p>
//           </div>
//         </div>

//         {/* Metrics */}
//         <div className="space-y-2">
//           {metrics.map(({ label, aVal, bVal, winner }) => (
//             <div key={label} className="grid grid-cols-3 gap-2 items-center">
//               <div className="rounded-lg p-2 text-center" style={{ background: winner === 'a' ? '#14532d' : '#0d1117', border: winner === 'a' ? '1px solid #22c55e44' : '1px solid #1f2937' }}>
//                 <p className="font-mono text-xs font-bold" style={{ color: winner === 'a' ? '#22c55e' : '#e5e7eb' }}>{aVal}</p>
//               </div>
//               <p className="text-center text-xs" style={{ color: '#4b5563' }}>{label}</p>
//               <div className="rounded-lg p-2 text-center" style={{ background: winner === 'b' ? '#14532d' : '#0d1117', border: winner === 'b' ? '1px solid #22c55e44' : '1px solid #1f2937' }}>
//                 <p className="font-mono text-xs font-bold" style={{ color: winner === 'b' ? '#22c55e' : '#e5e7eb' }}>{bVal}</p>
//               </div>
//             </div>
//           ))}
//         </div>

//         <p className="text-center text-xs mt-4" style={{ color: '#374151' }}>🟢 Green = better value</p>
//       </div>
//     </div>
//   );
// }

// function TokenCard({ token, onClick, onCompare, isCompareSelected }: { token: Token; onClick: () => void; onCompare: (t: Token) => void; isCompareSelected: boolean }) {
//   const isUp = (token.price24hChangePercent || 0) > 0;
//   const vol = token.volume24hUSD || token.v24hUSD || 0;
//   const priceStr = token.price < 0.001 ? token.price.toExponential(2) : token.price < 1 ? token.price.toFixed(4) : token.price.toFixed(2);
//   const safetyColor = (token.safetyScore || 0) >= 70 ? '#22c55e' : (token.safetyScore || 0) >= 40 ? '#eab308' : '#ef4444';

//   return (
//     <div className="rounded-xl p-4 cursor-pointer transition-all duration-300 active:scale-95 relative"
//       style={{
//         background: isCompareSelected ? 'linear-gradient(135deg, #0f1e2e, #0a1628)' : 'linear-gradient(135deg, #0f1117, #141820)',
//         border: isCompareSelected ? '1px solid #06b6d4' : '1px solid #1f2937',
//         boxShadow: isCompareSelected ? '0 0 20px #06b6d422' : '0 2px 8px rgba(0,0,0,0.4)',
//       }}
//       onMouseEnter={e => {
//         if (!isCompareSelected) {
//           (e.currentTarget as HTMLElement).style.border = `1px solid ${safetyColor}44`;
//           (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${safetyColor}22`;
//         }
//       }}
//       onMouseLeave={e => {
//         if (!isCompareSelected) {
//           (e.currentTarget as HTMLElement).style.border = '1px solid #1f2937';
//           (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
//         }
//       }}
//       onClick={onClick}>

//       {/* Share button + Compare button */}
//       <div className="absolute top-2 right-2 flex gap-1" onClick={e => e.stopPropagation()}>
//         <button
//           onClick={() => {
//             const url = `${window.location.origin}?token=${token.address}`;
//             navigator.clipboard.writeText(url);
//             alert(`Link copied! Share: ${url}`);
//           }}
//           className="text-xs px-1.5 py-0.5 rounded transition-all hover:opacity-100 opacity-0 group-hover:opacity-100"
//           style={{ background: '#1f2937', color: '#6b7280', fontSize: '9px' }}
//           title="Copy share link">
//           🔗
//         </button>
//         <button
//           onClick={() => onCompare(token)}
//           className="text-xs px-1.5 py-0.5 rounded transition-all"
//           style={{ background: isCompareSelected ? '#06b6d4' : '#1f2937', color: isCompareSelected ? '#000' : '#6b7280', fontSize: '9px' }}
//           title="Compare token">
//           ⚔️
//         </button>
//       </div>

//       <div className="flex items-center justify-between mb-3 pr-12">
//         <div className="flex items-center gap-2 min-w-0">
//           {token.logoURI ? (
//             <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full flex-shrink-0"
//               style={{ border: `2px solid ${safetyColor}44` }}
//               onError={(e) => { e.currentTarget.style.display = 'none'; }} />
//           ) : (
//             <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
//               style={{ background: `${safetyColor}22`, color: safetyColor, border: `2px solid ${safetyColor}44` }}>
//               {token.symbol?.slice(0, 2).toUpperCase()}
//             </div>
//           )}
//           <div className="min-w-0">
//             <p className="font-bold text-white text-sm truncate">{token.symbol}</p>
//             <p className="truncate" style={{ color: '#6b7280', fontSize: '11px', maxWidth: '80px' }}>{token.name}</p>
//           </div>
//         </div>
//         {token.safetyScore !== undefined && <SafetyBadge score={token.safetyScore} />}
//       </div>

//       <div className="flex items-end justify-between">
//         <div>
//           <p className="text-white font-mono text-base font-bold">${priceStr}</p>
//           <p style={{ color: '#4b5563', fontSize: '11px' }} className="mt-0.5">Vol: ${(vol / 1_000_000).toFixed(2)}M</p>
//         </div>
//         <div className="text-right">
//           <span className="text-sm font-bold" style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
//             {isUp ? '▲' : '▼'} {Math.abs(token.price24hChangePercent || 0).toFixed(2)}%
//           </span>
//           {token.liquidity && (
//             <p style={{ color: '#374151', fontSize: '10px' }}>Liq: ${(token.liquidity / 1000).toFixed(0)}K</p>
//           )}
//         </div>
//       </div>
//       {token.momentumScore !== undefined && <MomentumBar score={token.momentumScore} />}
//     </div>
//   );
// }

// function WhaleCard({ token, onClick }: { token: Token; onClick: () => void }) {
//   const volChange = token.volume24hChangePercent || token.v24hChangePercent || 0;
//   const vol = token.volume24hUSD || token.v24hUSD || 0;
//   return (
//     <div onClick={onClick} className="flex-shrink-0 rounded-xl p-3 cursor-pointer transition-all duration-300 hover:scale-105"
//       style={{ background: 'linear-gradient(135deg, #0f1e0f, #0a1a1a)', border: '1px solid #22c55e44', boxShadow: '0 0 20px #22c55e11', width: '200px' }}>
//       <div className="flex items-center gap-2 mb-2">
//         {token.logoURI && <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
//         <span className="font-bold text-white text-sm">{token.symbol}</span>
//         <span className="ml-auto" style={{ color: '#22c55e' }}>🐋</span>
//       </div>
//       <p className="font-bold text-sm" style={{ color: '#22c55e' }}>+{volChange.toFixed(0)}% vol</p>
//       <p style={{ color: '#6b7280', fontSize: '11px' }}>${(vol / 1_000_000).toFixed(2)}M traded</p>
//       <p className="font-mono text-white text-xs mt-1">${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}</p>
//     </div>
//   );
// }

// function AlertLog({ alerts }: { alerts: Alert[] }) {
//   if (alerts.length === 0) return null;
//   return (
//     <div className="rounded-xl p-4 mb-4" style={{ background: '#0a0e14', border: '1px solid #1f2937' }}>
//       <div className="flex items-center gap-2 mb-3">
//         <span>🔔</span>
//         <h3 className="font-bold text-white text-sm">Recent Alerts</h3>
//         <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fbbf2422', color: '#fbbf24', border: '1px solid #fbbf2444' }}>Last {alerts.length}</span>
//       </div>
//       <div className="space-y-2">
//         {alerts.map((alert, i) => (
//           <div key={i} className="flex items-center gap-3 text-xs rounded-lg px-3 py-2" style={{ background: '#0d1117', border: '1px solid #1f2937' }}>
//             <span>{alert.type === 'whale' ? '🐋' : '🚀'}</span>
//             <span className="font-bold text-white">{alert.token.symbol}</span>
//             <span style={{ color: '#22c55e' }}>+{(alert.token.volume24hChangePercent || 0).toFixed(0)}% vol</span>
//             <span style={{ color: '#6b7280' }}>•</span>
//             <span style={{ color: '#22c55e' }}>+{(alert.token.price24hChangePercent || 0).toFixed(0)}% price</span>
//             <span className="ml-auto" style={{ color: '#374151' }}>{alert.time}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function TokenModal({ token, onClose }: { token: Token; onClose: () => void }) {
//   const isUp = (token.price24hChangePercent || 0) > 0;
//   const fdv = token.fdv || token.mc || token.marketcap || 0;
//   const vol = token.volume24hUSD || token.v24hUSD || 0;
//   const safetyColor = (token.safetyScore || 0) >= 70 ? '#22c55e' : (token.safetyScore || 0) >= 40 ? '#eab308' : '#ef4444';

//   // Share link
//   const shareLink = typeof window !== 'undefined' ? `${window.location.origin}?token=${token.address}` : '';

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
//       style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
//       <div className="rounded-2xl p-6 max-w-md w-full my-4"
//         style={{ background: 'linear-gradient(135deg, #0d1117, #161b22)', border: `1px solid ${safetyColor}66`, boxShadow: `0 0 40px ${safetyColor}22` }}
//         onClick={e => e.stopPropagation()}>

//         <div className="flex items-center justify-between mb-4">
//           <div className="flex items-center gap-3">
//             {token.logoURI && <img src={token.logoURI} alt={token.symbol} className="w-12 h-12 rounded-full"
//               style={{ border: `2px solid ${safetyColor}66` }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
//             <div>
//               <h2 className="text-xl font-bold text-white">{token.symbol}</h2>
//               <p style={{ color: '#6b7280' }} className="text-sm">{token.name}</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             {/* Share button */}
//             <button
//               onClick={() => { navigator.clipboard.writeText(shareLink); alert('Link copied!'); }}
//               className="text-xs px-2 py-1 rounded-lg transition-all"
//               style={{ background: '#1f2937', color: '#6b7280', border: '1px solid #374151' }}
//               title="Copy share link">
//               🔗 Share
//             </button>
//             <button onClick={onClose} className="text-2xl leading-none" style={{ color: '#4b5563' }}>×</button>
//           </div>
//         </div>

//         <div className="grid grid-cols-2 gap-3 mb-4">
//           {[
//             { label: 'Price', value: `$${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}` },
//             { label: '24h Change', value: `${isUp ? '+' : ''}${(token.price24hChangePercent || 0).toFixed(2)}%`, color: isUp ? '#22c55e' : '#ef4444' },
//             { label: 'Volume 24h', value: `$${(vol / 1_000_000).toFixed(2)}M` },
//             { label: 'Liquidity', value: token.liquidity ? `$${(token.liquidity / 1000).toFixed(0)}K` : 'N/A' },
//             { label: 'FDV / MCap', value: fdv ? `$${(fdv / 1_000_000).toFixed(2)}M` : 'N/A' },
//             { label: 'Vol Change', value: token.volume24hChangePercent ? `${token.volume24hChangePercent.toFixed(1)}%` : 'N/A' },
//           ].map(({ label, value, color }) => (
//             <div key={label} className="rounded-lg p-3" style={{ background: '#0d1117', border: '1px solid #1f2937' }}>
//               <p style={{ color: '#4b5563', fontSize: '11px' }} className="mb-1">{label}</p>
//               <p className="font-mono text-sm font-bold" style={color ? { color } : { color: '#e5e7eb' }}>{value}</p>
//             </div>
//           ))}
//         </div>

//         {token.safetyScore !== undefined && (
//           <div className="rounded-lg p-3 mb-4" style={{ background: '#0d1117', border: `1px solid ${safetyColor}33` }}>
//             <div className="flex justify-between items-center mb-2">
//               <span style={{ color: '#9ca3af' }} className="text-sm">Risk Analysis</span>
//               <SafetyBadge score={token.safetyScore} />
//             </div>
//             <p style={{ color: '#6b7280', fontSize: '11px' }} className="mb-2">{token.riskReason}</p>
//             <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1f2937' }}>
//               <div className="h-full rounded-full" style={{ width: `${token.safetyScore}%`, background: `linear-gradient(90deg, ${safetyColor}88, ${safetyColor})` }} />
//             </div>
//           </div>
//         )}

//         <p style={{ color: '#374151', fontSize: '10px' }} className="break-all mb-3">{token.address}</p>
//         <button onClick={() => window.open(`https://birdeye.so/token/${token.address}?chain=solana`, '_blank')}
//           className="w-full font-bold py-2.5 rounded-lg transition-all text-sm hover:opacity-90"
//           style={{ background: `linear-gradient(90deg, ${safetyColor}cc, ${safetyColor})`, color: '#000' }}>
//           View on Birdeye ↗
//         </button>
//       </div>
//     </div>
//   );
// }

// function SkeletonCard() {
//   return (
//     <div className="rounded-xl p-4 animate-pulse" style={{ background: '#0f1117', border: '1px solid #1f2937' }}>
//       <div className="flex items-center gap-2 mb-3">
//         <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: '#1f2937' }} />
//         <div className="flex-1">
//           <div className="h-3 w-16 rounded mb-1" style={{ background: '#1f2937' }} />
//           <div className="h-2 w-24 rounded" style={{ background: '#1f2937' }} />
//         </div>
//       </div>
//       <div className="h-5 w-20 rounded mb-1" style={{ background: '#1f2937' }} />
//       <div className="h-3 w-28 rounded mb-2" style={{ background: '#1f2937' }} />
//       <div className="h-1 rounded-full" style={{ background: '#1f2937' }} />
//     </div>
//   );
// }

// type FilterType = 'all' | 'safe' | 'gainers' | 'momentum';

// export default function Dashboard() {
//   const [trending, setTrending] = useState<Token[]>([]);
//   const [newListings, setNewListings] = useState<Token[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState<'trending' | 'new'>('trending');
//   const [filter, setFilter] = useState<FilterType>('all');
//   const [lastUpdated, setLastUpdated] = useState('');
//   const [spinning, setSpinning] = useState(false);
//   const [selectedToken, setSelectedToken] = useState<Token | null>(null);
//   const [search, setSearch] = useState('');
//   const [alerts, setAlerts] = useState<Alert[]>([]);
//   const [compareTokens, setCompareTokens] = useState<Token[]>([]);
//   const [showCompare, setShowCompare] = useState(false);

//   // handle ?token= URL param
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const tokenAddress = params.get('token');
//     if (tokenAddress && trending.length > 0) {
//       const found = [...trending, ...newListings].find(t => t.address === tokenAddress);
//       if (found) setSelectedToken(found);
//     }
//   }, [trending, newListings]);

//   const enrichTokens = (tokens: Token[]): Token[] =>
//     tokens.map(token => {
//       const { score, reason } = calcRiskScore(token);
//       return { ...token, safetyScore: score, momentumScore: calcMomentum(token), riskReason: reason };
//     });

//   const fetchData = useCallback(async () => {
//     setSpinning(true);
//     setLoading(true);
//     try {
//       const [trendRes, newRes] = await Promise.all([fetch('/api/trending'), fetch('/api/new-listings')]);
//       const trendData = await trendRes.json();
//       const newData = await newRes.json();
//       const enrichedTrending = enrichTokens(trendData?.data?.tokens || []);
//       setTrending(enrichedTrending);
//       setNewListings(enrichTokens((newData?.data?.tokens || []).slice(0, 20)));
//       setLastUpdated(new Date().toLocaleTimeString());
//       const newAlerts: Alert[] = enrichedTrending
//         .filter(t => (t.volume24hChangePercent || 0) > 200 && (t.safetyScore || 0) >= 50)
//         .slice(0, 5)
//         .map(t => ({
//           token: t,
//           time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//           type: (t.volume24hChangePercent || 0) > 500 ? 'whale' : 'breakout',
//         }));
//       if (newAlerts.length > 0) setAlerts(newAlerts);
//     } catch (err) { console.error(err); }
//     setLoading(false);
//     setTimeout(() => setSpinning(false), 500);
//   }, []);

//   useEffect(() => {
//     fetchData();
//     const interval = setInterval(fetchData, 60000);
//     return () => clearInterval(interval);
//   }, [fetchData]);

//   const handleCompare = (token: Token) => {
//     setCompareTokens(prev => {
//       if (prev.find(t => t.address === token.address)) {
//         return prev.filter(t => t.address !== token.address);
//       }
//       if (prev.length >= 2) return [prev[1], token];
//       return [...prev, token];
//     });
//   };

//   useEffect(() => {
//     if (compareTokens.length === 2) setShowCompare(true);
//   }, [compareTokens]);

//   const whaleAlerts = trending
//     .filter(t => (t.volume24hChangePercent || t.v24hChangePercent || 0) > 100 && (t.volume24hUSD || 0) > 10000)
//     .sort((a, b) => (b.volume24hChangePercent || 0) - (a.volume24hChangePercent || 0))
//     .slice(0, 8);

//   const baseTokens = activeTab === 'trending' ? trending : newListings;
//   const filtered = baseTokens
//     .filter(t => {
//       if (!search) return true;
//       const q = search.toLowerCase();
//       return t.symbol?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q);
//     })
//     .filter(t => {
//       if (filter === 'safe') return (t.safetyScore || 0) >= 70;
//       if (filter === 'gainers') return (t.price24hChangePercent || 0) > 50;
//       if (filter === 'momentum') return (t.momentumScore || 0) >= 60;
//       return true;
//     });

//   const topGainer = trending.length > 0
//     ? [...trending].sort((a, b) => (b.price24hChangePercent || 0) - (a.price24hChangePercent || 0))[0]
//     : null;
//   const safeCount = trending.filter(t => (t.safetyScore || 0) >= 70).length;
//   const riskyCount = trending.filter(t => (t.safetyScore || 0) < 40).length;

//   return (
//     <main className="min-h-screen text-white" style={{ background: '#080b10', fontFamily: 'monospace' }}>
//       {selectedToken && <TokenModal token={selectedToken} onClose={() => setSelectedToken(null)} />}
//       {showCompare && compareTokens.length === 2 && (
//         <CompareModal tokens={compareTokens as [Token, Token]} onClose={() => { setShowCompare(false); setCompareTokens([]); }} />
//       )}

//       {/* Header */}
//       <div className="px-4 sm:px-6 py-4 sticky top-0 z-10"
//         style={{ background: 'rgba(8,11,16,0.95)', borderBottom: '1px solid #1f2937', backdropFilter: 'blur(10px)' }}>
//         <div className="max-w-6xl mx-auto flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-lg flex items-center justify-center text-black font-bold text-lg"
//               style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>⚡</div>
//             <div>
//               <h1 className="text-lg font-bold text-white">BirdRadar</h1>
//               <p className="text-xs hidden sm:block" style={{ color: '#4b5563' }}>Powered by Birdeye Data API</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             {compareTokens.length > 0 && (
//               <button onClick={() => compareTokens.length === 2 ? setShowCompare(true) : null}
//                 className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
//                 style={{ background: '#06b6d422', color: '#06b6d4', border: '1px solid #06b6d444' }}>
//                 ⚔️ Compare ({compareTokens.length}/2)
//               </button>
//             )}
//             {lastUpdated && <span className="text-xs hidden sm:block" style={{ color: '#374151' }}>Updated: {lastUpdated}</span>}
//             <button onClick={fetchData} className="p-2 rounded-lg text-lg" style={{ color: '#4b5563' }}
//               onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#06b6d4'}
//               onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4b5563'}>
//               <span className={spinning ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Stats Bar */}
//       <div className="px-4 sm:px-6 py-2" style={{ background: '#0a0e14', borderBottom: '1px solid #1f2937' }}>
//         <div className="max-w-6xl mx-auto flex flex-wrap gap-4 text-xs" style={{ color: '#6b7280' }}>
//           <span>🔥 Trending: <span className="text-white font-bold">{trending.length}</span></span>
//           <span>📊 Top Vol: <span className="text-white font-bold">{newListings.length}</span></span>
//           <span>🟢 Safe: <span className="font-bold" style={{ color: '#22c55e' }}>{safeCount}</span></span>
//           <span>🔴 Risky: <span className="font-bold" style={{ color: '#ef4444' }}>{riskyCount}</span></span>
//           <span>🐋 Whales: <span className="font-bold" style={{ color: '#06b6d4' }}>{whaleAlerts.length}</span></span>
//           <span className="ml-auto hidden sm:block" style={{ color: '#1f2937' }}>#BirdeyeAPI</span>
//         </div>
//       </div>

//       {/* Top Gainer Banner */}
//       {topGainer && !loading && (
//         <div className="px-4 sm:px-6 py-2 cursor-pointer"
//           style={{ background: 'linear-gradient(90deg, #0a0e14, #0d1f0d, #0a0e14)', borderBottom: '1px solid #14532d44' }}
//           onClick={() => setSelectedToken(topGainer)}>
//           <div className="max-w-6xl mx-auto flex items-center gap-3 text-xs">
//             <span className="font-bold" style={{ color: '#fbbf24' }}>🏆 TOP GAINER</span>
//             <span className="text-white font-bold">{topGainer.symbol}</span>
//             <span className="font-bold" style={{ color: '#22c55e' }}>+{(topGainer.price24hChangePercent || 0).toFixed(0)}%</span>
//             <span style={{ color: '#4b5563' }}>{topGainer.name}</span>
//             <span className="ml-auto" style={{ color: '#374151' }}>click to view →</span>
//           </div>
//         </div>
//       )}

//       {/* Whale Alerts */}
//       {whaleAlerts.length > 0 && !loading && (
//         <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #1f2937', background: '#090d12' }}>
//           <div className="max-w-6xl mx-auto">
//             <div className="flex items-center gap-2 mb-3">
//               <span>🐋</span>
//               <h2 className="font-bold text-white text-sm">Whale Alerts</h2>
//               <span className="text-xs px-2 py-0.5 rounded-full font-bold"
//                 style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>
//                 Volume Spike {'>'} 100%
//               </span>
//             </div>
//             <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
//               {whaleAlerts.map((token, i) => (
//                 <WhaleCard key={token.address + i} token={token} onClick={() => setSelectedToken(token)} />
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

//         {/* Fear & Greed + Top Movers */}
//         {!loading && trending.length > 0 && (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
//             <FearGreedMeter tokens={trending} />
//             <TopMovers tokens={trending} onSelect={setSelectedToken} />
//           </div>
//         )}

//         {/* Alert Log */}
//         <AlertLog alerts={alerts} />

//         {/* Compare hint */}
//         {compareTokens.length === 1 && (
//           <div className="rounded-lg px-4 py-2 mb-4 text-xs" style={{ background: '#06b6d422', border: '1px solid #06b6d444', color: '#06b6d4' }}>
//             ⚔️ <strong>{compareTokens[0].symbol}</strong> selected — click ⚔️ on another token to compare!
//           </div>
//         )}

//         {/* Search */}
//         <div className="mb-4">
//           <input type="text" placeholder="🔍  Search token symbol or name..."
//             value={search} onChange={e => setSearch(e.target.value)}
//             className="w-full px-4 py-2.5 text-sm text-white placeholder-gray-600 rounded-lg focus:outline-none transition-all"
//             style={{ background: '#0d1117', border: '1px solid #1f2937' }}
//             onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#06b6d4'}
//             onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#1f2937'} />
//         </div>

//         {/* Tabs + Filters */}
//         <div className="flex flex-wrap gap-2 mb-6">
//           {(['trending', 'new'] as const).map(tab => (
//             <button key={tab} onClick={() => { setActiveTab(tab); setFilter('all'); }}
//               className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
//               style={activeTab === tab
//                 ? { background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', color: '#000' }
//                 : { background: '#0d1117', color: '#6b7280', border: '1px solid #1f2937' }}>
//               {tab === 'trending' ? '🔥 Trending' : '📊 Top Volume'}
//             </button>
//           ))}
//           <div className="w-px mx-1 self-stretch hidden sm:block" style={{ background: '#1f2937' }} />
//           {([
//             { key: 'all', label: 'All' },
//             { key: 'safe', label: '🟢 Safe Only' },
//             { key: 'gainers', label: '🚀 >50% Gainers' },
//             { key: 'momentum', label: '⚡ High Momentum' },
//           ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
//             <button key={key} onClick={() => setFilter(key)}
//               className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
//               style={filter === key ? { background: '#1f2937', color: '#e5e7eb' } : { color: '#4b5563' }}>
//               {label}
//             </button>
//           ))}
//         </div>

//         {!loading && (
//           <p className="text-xs mb-3" style={{ color: '#374151' }}>
//             Showing {filtered.length} token{filtered.length !== 1 ? 's' : ''}
//             {filter !== 'all' && ' (filtered)'}{search && ` matching "${search}"`}
//           </p>
//         )}

//         {/* Grid */}
//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
//           {loading
//             ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
//             : filtered.length === 0
//             ? <div className="col-span-full text-center py-16" style={{ color: '#374151' }}>No tokens match your filter</div>
//             : filtered.map((token, i) => (
//               <TokenCard key={token.address + i} token={token}
//                 onClick={() => setSelectedToken(token)}
//                 onCompare={handleCompare}
//                 isCompareSelected={compareTokens.some(t => t.address === token.address)} />
//             ))
//           }
//         </div>

//         <div className="mt-10 pb-4 text-center text-xs" style={{ color: '#1f2937' }}>
//           Built with <span style={{ color: '#164e63' }}>Birdeye Data API</span> • Auto-refreshes every 60s • <span style={{ color: '#164e63' }}>#BirdeyeAPI</span>
//         </div>
//       </div>
//     </main>
//   );
// }





// new code 


'use client';
import { useEffect, useState, useCallback } from 'react';
// Kept recharts imports just in case you are using them elsewhere in your project
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

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
}

interface Alert {
  token: Token;
  time: string;
  type: 'whale' | 'breakout';
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

function SafetyBadge({ score }: { score: number }) {
  const isSafe = score >= 70;
  const isCaution = score >= 40;
  const colorClass = isSafe 
    ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' 
    : isCaution 
    ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' 
    : 'text-rose-400 border-rose-400/30 bg-rose-400/10';
  const label = isSafe ? 'SAFE' : isCaution ? 'CAUTION' : 'RISKY';
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border whitespace-nowrap ${colorClass}`}>
      {label} {score}
    </span>
  );
}

function MomentumBar({ score }: { score: number }) {
  const colorHex = score >= 70 ? '#34d399' : score >= 40 ? '#facc15' : '#9ca3af';
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Momentum</span>
        <span className="font-mono text-xs font-bold" style={{ color: colorHex }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800/50 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, transparent, ${colorHex})` }} />
      </div>
    </div>
  );
}

// Fear & Greed Meter
function FearGreedMeter({ tokens }: { tokens: Token[] }) {
  const { score, label, colorClass, hex } = calcFearGreed(tokens);
  const circumference = 2 * Math.PI * 36;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex items-center gap-6 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm">
      <div className="relative flex-shrink-0 w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 100 100" className="drop-shadow-lg">
          <circle cx="50" cy="50" r="36" fill="none" className="stroke-zinc-800" strokeWidth="8" />
          <circle cx="50" cy="50" r="36" fill="none" stroke={hex} strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-white">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Market Sentiment</p>
        <p className={`text-2xl font-bold ${colorClass} drop-shadow-sm`}>{label}</p>
        <p className="text-xs text-zinc-500 mt-2">
          Based on <span className="text-zinc-300 font-mono">{tokens.length}</span> trending tokens
        </p>
      </div>
    </div>
  );
}

// Top Movers Summary
function TopMovers({ tokens, onSelect }: { tokens: Token[]; onSelect: (t: Token) => void }) {
  if (tokens.length === 0) return null;
  const topGainers = [...tokens].sort((a, b) => (b.price24hChangePercent || 0) - (a.price24hChangePercent || 0)).slice(0, 3);
  const topVolume = [...tokens].sort((a, b) => (b.volume24hChangePercent || 0) - (a.volume24hChangePercent || 0)).slice(0, 3);
  const topSafe = [...tokens].filter(t => (t.safetyScore || 0) >= 70).sort((a, b) => (b.safetyScore || 0) - (a.safetyScore || 0)).slice(0, 3);

  const Section = ({ title, icon, items, valueFormat, colorClass }: any) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 text-zinc-400">
        <span className="text-sm">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-wider">{title}</p>
      </div>
      <div className="space-y-2">
        {items.map((token: Token, i: number) => (
          <div key={token.address} onClick={() => onSelect(token)}
            className="group flex items-center gap-3 p-2 rounded-xl cursor-pointer bg-zinc-950/50 border border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all">
            <span className="text-[10px] font-mono text-zinc-600 w-4">{i + 1}</span>
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-5 h-5 rounded-full flex-shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-800 flex-shrink-0" />
            )}
            <span className="text-sm font-bold text-zinc-200 truncate flex-1 group-hover:text-white transition-colors">{token.symbol}</span>
            <span className={`text-xs font-mono font-bold whitespace-nowrap ${colorClass}`}>
              {valueFormat(token)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm mb-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">📊</span>
        <p className="text-sm font-bold text-white uppercase tracking-wider">Top Movers</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
        <div className="pt-4 md:pt-0 md:pl-4 first:pt-0 first:pl-0"><Section title="Gainers" icon="🚀" items={topGainers} colorClass="text-emerald-400" valueFormat={(t: Token) => `+${(t.price24hChangePercent || 0).toFixed(0)}%`} /></div>
        <div className="pt-4 md:pt-0 md:pl-4"><Section title="Vol Spike" icon="🐋" items={topVolume} colorClass="text-cyan-400" valueFormat={(t: Token) => `+${((t.volume24hChangePercent || 0)).toFixed(0)}%`} /></div>
        <div className="pt-4 md:pt-0 md:pl-4"><Section title="Safest" icon="🛡️" items={topSafe} colorClass="text-emerald-400" valueFormat={(t: Token) => `${t.safetyScore}/100`} /></div>
      </div>
    </div>
  );
}

// Token Comparison
function CompareModal({ tokens, onClose }: { tokens: [Token, Token]; onClose: () => void }) {
  const [a, b] = tokens;
  const metrics = [
    { label: 'Price', aVal: `$${a.price < 0.001 ? a.price.toExponential(2) : a.price.toFixed(4)}`, bVal: `$${b.price < 0.001 ? b.price.toExponential(2) : b.price.toFixed(4)}`, winner: null },
    { label: '24h Change', aVal: `${(a.price24hChangePercent || 0).toFixed(1)}%`, bVal: `${(b.price24hChangePercent || 0).toFixed(1)}%`, winner: (a.price24hChangePercent || 0) > (b.price24hChangePercent || 0) ? 'a' : 'b' },
    { label: 'Volume', aVal: `$${((a.volume24hUSD || 0) / 1e6).toFixed(2)}M`, bVal: `$${((b.volume24hUSD || 0) / 1e6).toFixed(2)}M`, winner: (a.volume24hUSD || 0) > (b.volume24hUSD || 0) ? 'a' : 'b' },
    { label: 'Safety Score', aVal: `${a.safetyScore}/100`, bVal: `${b.safetyScore}/100`, winner: (a.safetyScore || 0) > (b.safetyScore || 0) ? 'a' : 'b' },
    { label: 'Momentum', aVal: `${a.momentumScore}/100`, bVal: `${b.momentumScore}/100`, winner: (a.momentumScore || 0) > (b.momentumScore || 0) ? 'a' : 'b' },
    { label: 'Liquidity', aVal: `$${((a.liquidity || 0) / 1000).toFixed(0)}K`, bVal: `$${((b.liquidity || 0) / 1000).toFixed(0)}K`, winner: (a.liquidity || 0) > (b.liquidity || 0) ? 'a' : 'b' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">⚔️ Token Comparison</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-900">✕</button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 text-center rounded-2xl bg-zinc-900 border border-zinc-800">
            {a.logoURI && <img src={a.logoURI} alt={a.symbol} className="w-10 h-10 mx-auto mb-2 rounded-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            <p className="text-sm font-bold text-white">{a.symbol}</p>
          </div>
          <div className="flex items-center justify-center text-3xl text-zinc-700 font-black italic">VS</div>
          <div className="p-4 text-center rounded-2xl bg-zinc-900 border border-zinc-800">
            {b.logoURI && <img src={b.logoURI} alt={b.symbol} className="w-10 h-10 mx-auto mb-2 rounded-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            <p className="text-sm font-bold text-white">{b.symbol}</p>
          </div>
        </div>

        <div className="space-y-3">
          {metrics.map(({ label, aVal, bVal, winner }) => (
            <div key={label} className="grid grid-cols-3 gap-4 items-center">
              <div className={`p-2.5 text-center rounded-xl transition-colors ${winner === 'a' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                <p className={`font-mono text-sm font-bold ${winner === 'a' ? 'text-emerald-400' : 'text-zinc-300'}`}>{aVal}</p>
              </div>
              <p className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
              <div className={`p-2.5 text-center rounded-xl transition-colors ${winner === 'b' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                <p className={`font-mono text-sm font-bold ${winner === 'b' ? 'text-emerald-400' : 'text-zinc-300'}`}>{bVal}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TokenCard({ token, onClick, onCompare, isCompareSelected }: { token: Token; onClick: () => void; onCompare: (t: Token) => void; isCompareSelected: boolean }) {
  const isUp = (token.price24hChangePercent || 0) > 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const priceStr = token.price < 0.001 ? token.price.toExponential(2) : token.price < 1 ? token.price.toFixed(4) : token.price.toFixed(2);
  
  return (
    <div className={`group relative p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${
        isCompareSelected 
          ? 'bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
          : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-xl'
      }`} onClick={onClick}>
      
      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => {
            const url = `${window.location.origin}?token=${token.address}`;
            navigator.clipboard.writeText(url);
            alert(`Link copied! Share: ${url}`);
          }}
          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          title="Copy share link">
          🔗
        </button>
        <button
          onClick={() => onCompare(token)}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
            isCompareSelected ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
          }`}
          title="Compare token">
          ⚔️ Compare
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 pr-16">
        <div className="flex items-center gap-3 min-w-0">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full flex-shrink-0 bg-zinc-950"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 flex-shrink-0">
              {token.symbol?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-bold text-white truncate">{token.symbol}</p>
            <p className="text-xs text-zinc-500 truncate max-w-[100px]">{token.name}</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        {token.safetyScore !== undefined && <SafetyBadge score={token.safetyScore} />}
      </div>

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

function WhaleCard({ token, onClick }: { token: Token; onClick: () => void }) {
  const volChange = token.volume24hChangePercent || token.v24hChangePercent || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  return (
    <div onClick={onClick} className="flex-shrink-0 w-56 p-4 rounded-2xl cursor-pointer bg-emerald-950/20 border border-emerald-500/30 hover:bg-emerald-900/30 hover:-translate-y-1 transition-all">
      <div className="flex items-center gap-3 mb-3">
        {token.logoURI && <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full bg-zinc-950" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <span className="text-base font-bold text-white">{token.symbol}</span>
        <span className="ml-auto text-xl">🐋</span>
      </div>
      <p className="text-sm font-bold text-emerald-400 mb-0.5">+{volChange.toFixed(0)}% Volume</p>
      <p className="text-xs text-zinc-400 font-mono mb-2">${(vol / 1_000_000).toFixed(2)}M traded</p>
      <p className="font-mono text-sm font-bold text-white">${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}</p>
    </div>
  );
}

function AlertLog({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-lg">🔔</span>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Alerts</h3>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Last {alerts.length}</span>
      </div>
      <div className="space-y-2.5">
        {alerts.map((alert, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
            <span className="text-base">{alert.type === 'whale' ? '🐋' : '🚀'}</span>
            <span className="font-bold text-white">{alert.token.symbol}</span>
            <span className="font-mono text-xs font-bold text-emerald-400">+{(alert.token.volume24hChangePercent || 0).toFixed(0)}% vol</span>
            <span className="text-zinc-700">•</span>
            <span className="font-mono text-xs font-bold text-emerald-400">+{(alert.token.price24hChangePercent || 0).toFixed(0)}% price</span>
            <span className="ml-auto text-xs font-mono text-zinc-500">{alert.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenModal({ token, onClose }: { token: Token; onClose: () => void }) {
  const isUp = (token.price24hChangePercent || 0) > 0;
  const fdv = token.fdv || token.mc || token.marketcap || 0;
  const vol = token.volume24hUSD || token.v24hUSD || 0;
  const safetyHex = (token.safetyScore || 0) >= 70 ? '#34d399' : (token.safetyScore || 0) >= 40 ? '#facc15' : '#f43f5e';

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}?token=${token.address}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md p-6 my-8 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        
        {/* Glow effect */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: safetyHex }} />

        <div className="flex items-start justify-between mb-8 relative">
          <div className="flex items-center gap-4">
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-zinc-800" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500">
                {token.symbol?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-white">{token.symbol}</h2>
              <p className="text-sm text-zinc-400">{token.name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-full transition-colors">✕</button>
            <button
              onClick={() => { navigator.clipboard.writeText(shareLink); alert('Link copied!'); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors font-medium">
              🔗 Share
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 relative">
          {[
            { label: 'Price', value: `$${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}` },
            { label: '24h Change', value: `${isUp ? '+' : ''}${(token.price24hChangePercent || 0).toFixed(2)}%`, colorClass: isUp ? 'text-emerald-400' : 'text-rose-400' },
            { label: 'Volume 24h', value: `$${(vol / 1_000_000).toFixed(2)}M` },
            { label: 'Liquidity', value: token.liquidity ? `$${(token.liquidity / 1000).toFixed(0)}K` : 'N/A' },
            { label: 'FDV / MCap', value: fdv ? `$${(fdv / 1_000_000).toFixed(2)}M` : 'N/A' },
            { label: 'Vol Change', value: token.volume24hChangePercent ? `${token.volume24hChangePercent.toFixed(1)}%` : 'N/A' },
          ].map(({ label, value, colorClass }) => (
            <div key={label} className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">{label}</p>
              <p className={`font-mono text-sm font-bold ${colorClass || 'text-zinc-200'}`}>{value}</p>
            </div>
          ))}
        </div>

        {token.safetyScore !== undefined && (
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 mb-6 relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Risk Analysis</span>
              <SafetyBadge score={token.safetyScore} />
            </div>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{token.riskReason}</p>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${token.safetyScore}%`, backgroundColor: safetyHex }} />
            </div>
          </div>
        )}

        <p className="text-[10px] font-mono text-zinc-600 break-all mb-6 text-center">{token.address}</p>
        
        <button onClick={() => window.open(`https://birdeye.so/token/${token.address}?chain=solana`, '_blank')}
          className="w-full py-4 rounded-xl font-bold text-sm text-zinc-950 transition-all hover:opacity-90 flex items-center justify-center gap-2"
          style={{ backgroundColor: safetyHex }}>
          View on Birdeye ↗
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/30 animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-zinc-800/50" />
        <div className="flex-1">
          <div className="h-4 w-16 bg-zinc-800/50 rounded mb-2" />
          <div className="h-2 w-24 bg-zinc-800/50 rounded" />
        </div>
      </div>
      <div className="h-6 w-20 bg-zinc-800/50 rounded mb-2" />
      <div className="h-3 w-28 bg-zinc-800/50 rounded mb-4" />
      <div className="h-1.5 w-full bg-zinc-800/50 rounded-full" />
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [compareTokens, setCompareTokens] = useState<Token[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenAddress = params.get('token');
    if (tokenAddress && trending.length > 0) {
      const found = [...trending, ...newListings].find(t => t.address === tokenAddress);
      if (found) setSelectedToken(found);
    }
  }, [trending, newListings]);

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
      const enrichedTrending = enrichTokens(trendData?.data?.tokens || []);
      setTrending(enrichedTrending);
      setNewListings(enrichTokens((newData?.data?.tokens || []).slice(0, 20)));
      setLastUpdated(new Date().toLocaleTimeString());
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
      if (prev.find(t => t.address === token.address)) {
        return prev.filter(t => t.address !== token.address);
      }
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30">
      {selectedToken && <TokenModal token={selectedToken} onClose={() => setSelectedToken(null)} />}
      {showCompare && compareTokens.length === 2 && (
        <CompareModal tokens={compareTokens as [Token, Token]} onClose={() => { setShowCompare(false); setCompareTokens([]); }} />
      )}

      {/* Glass Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20">⚡</div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">BirdRadar</h1>
              <p className="text-xs font-medium text-zinc-500 hidden sm:block">Powered by Birdeye Data API</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {compareTokens.length > 0 && (
              <button onClick={() => compareTokens.length === 2 ? setShowCompare(true) : null}
                className="text-xs px-4 py-2 rounded-xl font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
                ⚔️ Compare ({compareTokens.length}/2)
              </button>
            )}
            {lastUpdated && <span className="text-xs font-mono text-zinc-500 hidden sm:block">Updated: {lastUpdated}</span>}
            <button onClick={fetchData} className="p-2.5 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
              <span className={spinning ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-zinc-900/30 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <span>🔥 Trending: <span className="text-zinc-200 font-bold ml-1">{trending.length}</span></span>
          <span>📊 Top Vol: <span className="text-zinc-200 font-bold ml-1">{newListings.length}</span></span>
          <span>🟢 Safe: <span className="text-emerald-400 font-bold ml-1">{safeCount}</span></span>
          <span>🔴 Risky: <span className="text-rose-400 font-bold ml-1">{riskyCount}</span></span>
          <span>🐋 Whales: <span className="text-cyan-400 font-bold ml-1">{whaleAlerts.length}</span></span>
        </div>
      </div>

      {/* Top Gainer Banner */}
      {topGainer && !loading && (
        <div className="bg-gradient-to-r from-zinc-950 via-emerald-950/20 to-zinc-950 border-b border-emerald-900/30 cursor-pointer hover:bg-emerald-900/10 transition-colors"
          onClick={() => setSelectedToken(topGainer)}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 text-xs">
            <span className="font-black text-yellow-500 flex items-center gap-1.5"><span className="text-base">🏆</span> TOP GAINER</span>
            <span className="text-white font-bold">{topGainer.symbol}</span>
            <span className="font-mono font-bold text-emerald-400">+{(topGainer.price24hChangePercent || 0).toFixed(0)}%</span>
            <span className="text-zinc-500 hidden sm:block truncate max-w-xs">{topGainer.name}</span>
            <span className="ml-auto text-emerald-500 font-medium">Click to view ↗</span>
          </div>
        </div>
      )}

      {/* Whale Alerts */}
      {whaleAlerts.length > 0 && !loading && (
        <div className="border-b border-zinc-800/50 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl">🐋</span>
              <h2 className="font-black text-white text-base tracking-tight">Whale Alerts</h2>
              <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Volume Spike {'>'} 100%
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {whaleAlerts.map((token, i) => (
                <WhaleCard key={token.address + i} token={token} onClick={() => setSelectedToken(token)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Fear & Greed + Top Movers */}
        {!loading && trending.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <FearGreedMeter tokens={trending} />
            <TopMovers tokens={trending} onSelect={setSelectedToken} />
          </div>
        )}

        {/* Alert Log */}
        <AlertLog alerts={alerts} />

        {/* Compare hint */}
        {compareTokens.length === 1 && (
          <div className="p-4 rounded-xl mb-6 text-sm bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 flex items-center gap-3">
            <span className="text-lg">⚔️</span> 
            <span><strong>{compareTokens[0].symbol}</strong> selected. Click compare on another token to initiate battle!</span>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
          <input type="text" placeholder="Search token symbol or name..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-4 text-sm text-white placeholder-zinc-600 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-cyan-500 focus:bg-zinc-900 transition-all shadow-sm" />
        </div>

        {/* Tabs + Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            {(['trending', 'new'] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setFilter('all'); }}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}>
                {tab === 'trending' ? '🔥 Trending' : '📊 Top Volume'}
              </button>
            ))}
          </div>
          <div className="w-px h-8 mx-2 bg-zinc-800 hidden md:block" />
          {([
            { key: 'all', label: 'All' },
            { key: 'safe', label: '🟢 Safe Only' },
            { key: 'gainers', label: '🚀 >50% Gainers' },
            { key: 'momentum', label: '⚡ High Momentum' },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                filter === key 
                ? 'bg-zinc-100 text-zinc-900 shadow-md' 
                : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-xs font-medium text-zinc-500 mb-4 uppercase tracking-wider">
            Showing <span className="text-zinc-300 font-mono">{filtered.length}</span> token{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && ' (filtered)'}{search && ` matching "${search}"`}
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {loading
            ? Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
            ? <div className="col-span-full text-center py-24 text-zinc-500 font-medium bg-zinc-900/20 rounded-3xl border border-zinc-800 border-dashed">No tokens match your filter</div>
            : filtered.map((token, i) => (
              <TokenCard key={token.address + i} token={token}
                onClick={() => setSelectedToken(token)}
                onCompare={handleCompare}
                isCompareSelected={compareTokens.some(t => t.address === token.address)} />
            ))
          }
        </div>

        <div className="mt-16 pb-8 text-center text-xs font-medium text-zinc-600">
          Built with <span className="text-zinc-400">Birdeye Data API</span> • Auto-refreshes every 60s
        </div>
      </div>
    </main>
  );
}

