import { EXPONENT } from "./addresses"

/** Shape of GET https://api.exponent.finance/markets (undocumented, observed 2026-09-14). */
export interface ExponentMarket {
  vaultAddress: string
  underlyingAsset: string
  syTokenName: string
  tokenName: string
  baseTokenMint: string
  ptMint: string
  ytMint: string
  syMint: string
  decimals: number
  ptPriceInAsset: number
  ytPriceInAsset: number
  impliedApy: number
  underlyingApy: number
  underlyingApy7Epoch: number
  underlyingApy30Epoch: number
  syExchangeRate: number
  ptRedemptionRate: number
  maturityDateUnixTs: number
  startDateUnixTs: number
  marketStatus: "active" | "matured" | string
  platformName: string
  interfaceType: string
  liquidity: number
  volume: number
  orderbookAddresses: string[]
  legacyMarketAddresses: string[]
  additionalAddressLookupTable?: string | null
}

export async function fetchExponentMarkets(init?: RequestInit): Promise<ExponentMarket[]> {
  const res = await fetch(`${EXPONENT.apiBase}/markets`, init)
  if (!res.ok) throw new Error(`Exponent /markets ${res.status}`)
  const body = (await res.json()) as ExponentMarket[] | { markets: ExponentMarket[] }
  return Array.isArray(body) ? body : body.markets
}
