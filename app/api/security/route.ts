import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'No address' }, { status: 400 });

  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/token_security?address=${address}`,
      {
        headers: {
          'X-API-KEY': process.env.BIRDEYE_API_KEY!,
          'x-chain': 'solana',
        },
      }
    );
    const raw = await res.text(); // get RAW text first
    console.log('RAW security response:', raw.slice(0, 500));
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Security fetch error:', err);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}