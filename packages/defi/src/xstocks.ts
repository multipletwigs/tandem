import createClient from "openapi-fetch"
import type { paths } from "./generated/xstocks"
import { XSTOCKS } from "./addresses"

/**
 * xStocks (Backed) API. Public endpoints need `?network=Solana`; trading/issuance
 * endpoints need an `X-API-KEY` and Backed KYC onboarding.
 */
export function createXStocksClient(apiKey?: string) {
  return createClient<paths>({
    baseUrl: XSTOCKS.apiBase.replace(/\/public$/, ""),
    headers: apiKey ? { "X-API-KEY": apiKey } : undefined,
  })
}
export const xstocks = createXStocksClient()
export type XStocksPaths = paths
