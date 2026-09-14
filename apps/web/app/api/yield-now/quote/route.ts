import { NextRequest, NextResponse } from "next/server"
import { quoteYieldNow } from "@workspace/defi"

export async function POST(req: NextRequest) {
  const { usdcAmount, vaultAddress, stockMint } = (await req.json()) as {
    usdcAmount: string
    vaultAddress: string
    stockMint: string
  }
  try {
    const q = await quoteYieldNow({
      usdcAmount: BigInt(usdcAmount),
      vaultAddress,
      stockMint,
      jupiterApiKey: process.env.JUPITER_API_KEY,
    })
    return NextResponse.json({
      baseIn: q.baseIn.toString(),
      ptOut: q.ptOut.toString(),
      ytOut: q.ytOut.toString(),
      ytProceedsBase: q.ytProceedsBase.toString(),
      stockOut: q.stockOut.toString(),
      stockOutUsd: q.stockOutUsd ?? null,
      maturity: q.maturity.toISOString(),
      impliedApy: q.impliedApy,
      ytPrice: q.market.ytPriceInAsset,
      baseMint: q.market.underlyingAsset.mint,
      baseSymbol: q.market.underlyingAsset.ticker,
      decimals: q.market.decimals,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
