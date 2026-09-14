import { NextResponse } from "next/server"
import { sunrise } from "@workspace/defi"

type SunriseToken = {
  address: string
  symbol: string
  name: string
  decimals: number
  issuer?: string
  assetClass?: string
  icon?: string
  stock?: { ticker?: string; exchange?: string }
}

/** Backpack Securities stocks listed on Sunrise. */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await sunrise.GET("/v1/tokens")
  if (error) return NextResponse.json({ error }, { status: 502 })
  const env = data as unknown as { data?: { tokens?: SunriseToken[] } | SunriseToken[]; tokens?: SunriseToken[] }
  const list: SunriseToken[] = Array.isArray(env.data) ? env.data : env.data?.tokens ?? env.tokens ?? []
  const stocks = list
    .filter((t) => t.issuer === "backpack_securities" && t.assetClass === "stock")
    .map((t) => ({ address: t.address, symbol: t.symbol, name: t.name.replace(/ - Backpack Securities$/, ""), decimals: t.decimals, icon: t.icon }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
  return NextResponse.json(stocks, { headers: { "Cache-Control": "s-maxage=300" } })
}
