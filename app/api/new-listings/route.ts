import { NextResponse } from 'next/server';

let cache: { data: any; time: number } | null = null;
const CACHE_MS = 5 * 60 * 1000; // cache 5 minutes to avoid rate limit

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.time < CACHE_MS) {
      console.log('NEW LISTINGS: serving from cache');
      return NextResponse.json({ data: { tokens: cache.data } });
    }

    const res = await fetch(
      'https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=20&min_liquidity=100',
      {
        headers: {
          'X-API-KEY': process.env.BIRDEYE_API_KEY!,
          'x-chain': 'solana',
        },
        cache: 'no-store',
      }
    );

    if (res.status === 429) {
      console.log('NEW LISTINGS: rate limited, serving stale cache');
      if (cache) return NextResponse.json({ data: { tokens: cache.data } });
      return NextResponse.json({ data: { tokens: [] } });
    }

    const raw = await res.json();
    const rawTokens = raw?.data?.tokens || [];

    // Normalize field names to match trending token structure
    const tokens = rawTokens.map((t: any) => ({
      ...t,
      volume24hUSD: t.v24hUSD || 0,
      price24hChangePercent: t.v24hChangePercent || 0,
      liquidity: t.liquidity || 0,
    }));

    cache = { data: tokens, time: Date.now() };
    console.log('NEW LISTINGS: fetched', tokens.length, 'tokens');
    return NextResponse.json({ data: { tokens } });
  } catch (err) {
    console.error('NEW LISTINGS ERROR:', err);
    if (cache) return NextResponse.json({ data: { tokens: cache.data } });
    return NextResponse.json({ data: { tokens: [] } });
  }
}
