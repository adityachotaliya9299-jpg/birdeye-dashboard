import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch(
    'https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20',
    {
      headers: {
        'X-API-KEY': process.env.BIRDEYE_API_KEY!,
        'x-chain': 'solana',
      },
      next: { revalidate: 60 },
    }
  );
  const data = await res.json();
  return NextResponse.json(data);
}
