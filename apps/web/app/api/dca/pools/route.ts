import { NextResponse } from "next/server"
import { listUsdcPools } from "@workspace/defi"

/** USDC yield pools across JupLend, Kamino, Loopscale with live APY. */
export async function GET() {
  const pools = await listUsdcPools()
  return NextResponse.json(pools, { headers: { "Cache-Control": "s-maxage=120" } })
}
