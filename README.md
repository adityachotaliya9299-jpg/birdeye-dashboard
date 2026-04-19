# BirdRadar ⚡

Real-time Solana token safety scanner powered by Birdeye Data API.

## 🔴 Live Demo
[https://birdeye-dashboard.vercel.app](https://birdeye-dashboard.vercel.app)

## 🛡️ What it does
- Scans trending Solana tokens in real-time
- Scores each token 0-100 for rug pull risk automatically
- Calculates momentum score (volume + price action combined)
- Top Volume scanner — see highest volume tokens on Solana
- Search and filter: Safe Only, >50% Gainers, High Momentum
- Click any token for full details
- Auto-refreshes every 60 seconds

## 🔌 Birdeye Endpoints Used
- `/defi/token_trending` — real-time trending tokens
- `/defi/tokenlist` — top volume tokens on Solana

## 🛠️ Tech Stack
- Next.js 14 + TypeScript
- Tailwind CSS
- Birdeye Data API
- Vercel (deployment)

## 🚀 Run Locally
\`\`\`bash
git clone https://github.com/adityachotaliya9299-jpg/birdeye-dashboard
cd birdeye-dashboard
npm install
# Create .env.local and add:
# BIRDEYE_API_KEY=your_key_here
npm run dev
\`\`\`

## 📊 Risk Scoring Logic
Each token is scored 0-100 based on:
- Liquidity depth (low liquidity = high rug risk)
- Volume/liquidity ratio (detects wash trading)
- Price pump magnitude (extreme pumps = dump risk)
- Market cap size (micro caps = higher risk)
- Volume change anomalies (bot activity detection)

Built for Birdeye Data BIP Competition Sprint 1 • #BirdeyeAPI
