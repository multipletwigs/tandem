import { NextResponse } from "next/server"
import { fetchExponentMarkets } from "@workspace/defi"

/** Active Exponent markets that have an orderbook (where YT can be sold). */
export async function GET() {
  const markets = await fetchExponentMarkets()
  const out = markets
    .filter((m) => m.marketStatus === "active" && m.orderbookAddresses.length > 0)
    .map((m) => ({
      vaultAddress: m.vaultAddress,
      tokenName: m.tokenName,
      platformName: m.platformName,
      baseMint: m.underlyingAsset.mint,
      decimals: m.decimals,
      impliedApy: m.impliedApy,
      underlyingApy: m.underlyingApy,
      ytPriceInAsset: m.ytPriceInAsset,
      ptPriceInAsset: m.ptPriceInAsset,
      maturity: m.maturityDateUnixTs,
      orderbook: m.orderbookAddresses[0],
    }))
    .sort((a, b) => a.maturity - b.maturity)
  return NextResponse.json(out, { headers: { "Cache-Control": "s-maxage=60" } })
}
