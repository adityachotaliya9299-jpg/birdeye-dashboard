import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BirdRadar ⚡ — Real-time Solana Token Safety Scanner",
  description:
    "BirdRadar scans trending Solana tokens in real-time using Birdeye Data API. Safety scoring, momentum tracking, whale alerts, Fear & Greed meter — built for the Birdeye BIP Competition.",
  keywords: [
    "Solana",
    "token scanner",
    "DeFi",
    "Birdeye",
    "safety score",
    "rug pull detector",
    "trending tokens",
    "BirdeyeAPI",
  ],
  authors: [{ name: "Aditya Chotaliya", url: "https://portfolio-one-bice-xqt0376aiu.vercel.app" }],
  openGraph: {
    title: "BirdRadar ⚡ — Real-time Solana Token Safety Scanner",
    description:
      "Scan trending Solana tokens for rug risk, momentum & whale activity. Powered by Birdeye Data API.",
    url: "https://birdeye-dashboard.vercel.app",
    siteName: "BirdRadar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BirdRadar ⚡ — Real-time Solana Token Safety Scanner",
    description:
      "Scan trending Solana tokens for rug risk, momentum & whale activity. Powered by Birdeye Data API. #BirdeyeAPI",
    creator: "@adityachotaliya",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950">{children}</body>
    </html>
  );
}