import { NextRequest, NextResponse } from "next/server"

/**
 * Server-side Solana RPC proxy. The browser talks to /api/rpc, this route talks to
 * SOLANA_RPC_URL (Helius). Helius only sees the server's IP, so localhost works.
 */
export async function POST(req: NextRequest) {
  const upstream = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com"
  const body = await req.text()
  const res = await fetch(upstream, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  return new NextResponse(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  })
}
