import createClient from "openapi-fetch"
import type { paths } from "./generated/sunrise"
import { SUNRISE } from "./addresses"

/** Typed client for the Sunrise public API (no auth). */
export const sunrise = createClient<paths>({ baseUrl: SUNRISE.apiBase })
export type SunrisePaths = paths

export interface SunriseQuote {
  quoteId: string
  routeName: string
  providerRequestId?: string
  /** base64 unsigned tx, present only when fromAddress/toAddress were supplied */
  unsignedTransaction?: string
  fromToken: string
  toToken: string
  fromAmount: string
  fromAmountUSD?: number
  toAmount: string
  toAmountUSD?: number
}

/** POST /v1/quotes — pass `fromAddress` to get an unsigned transaction back. */
export async function quoteSunrise(body: {
  fromToken: string
  toToken: string
  fromAmount: string | bigint
  fromAddress?: string
  toAddress?: string
}): Promise<SunriseQuote[]> {
  const { data, error } = await sunrise.POST("/v1/quotes", {
    body: { ...body, fromAmount: String(body.fromAmount) },
  })
  if (error) throw new Error(`Sunrise /v1/quotes: ${JSON.stringify(error)}`)
  const env = data as unknown as { data?: { quotes?: SunriseQuote[] }; quotes?: SunriseQuote[] }
  return env.data?.quotes ?? env.quotes ?? []
}

/** POST /v1/execute — submit the wallet-signed tx for a quote, then poll `/v1/status` on the caller side. */
export async function executeSunrise(body: {
  signedTransaction: string
  quoteId: string
  routeName: string
  providerRequestId?: string
}) {
  const { data, error } = await sunrise.POST("/v1/execute", { body })
  if (error) throw new Error(`Sunrise /v1/execute: ${JSON.stringify(error)}`)
  return data
}
