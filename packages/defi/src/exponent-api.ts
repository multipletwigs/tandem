import { EXPONENT } from "./addresses"

/** Shape of GET https://api.exponent.finance/markets (undocumented, observed 2026-09-14). */
export interface ExponentMarket {
  vaultAddress: string
  underlyingAsset: { mint: string; name: string; ticker: string; decimals: number }
  quoteAsset: { mint: string; name: string; ticker: string; decimals: number }
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

/** GET /vaults — every vault ever created (85 as of 2026-09-14), including matured ones. */
export interface ExponentVault {
  address: string
  /** e.g. "kUSDC-02JUL25" */
  name: string
  start_timestamp: number
  end_timestamp: number
  alt_address?: string | null
  pt_mint: string
  yt_mint: string
  implied_apy: number
  pt_price: number
  yt_price: number
  clmm_markets: string[]
  orderbooks: string[]
  tvl_in_base_token: number
}

export async function fetchExponentVaults(init?: RequestInit): Promise<ExponentVault[]> {
  const res = await fetch(`${EXPONENT.apiBase}/vaults`, init)
  if (!res.ok) throw new Error(`Exponent /vaults ${res.status}`)
  const body = (await res.json()) as ExponentVault[] | { vaults: ExponentVault[] }
  return Array.isArray(body) ? body : body.vaults
}
