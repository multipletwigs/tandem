import createClient from "openapi-fetch"
import type { paths } from "./generated/solstice"
import { SOLSTICE } from "./addresses"

/** Solstice USX protocol API. `/v1/info/*` needs an api_key; `/v1/apy` and `/v1/tvl` are public. */
export const solstice = createClient<paths>({ baseUrl: SOLSTICE.apiBase })
export type SolsticePaths = paths

export async function fetchSolsticeApy(): Promise<{ apy: number }> {
  const res = await fetch(`${SOLSTICE.apiBase}/v1/apy`)
  if (!res.ok) throw new Error(`Solstice /v1/apy ${res.status}`)
  return (await res.json()) as { apy: number }
}
