import { HYLO } from "./addresses"

/** Undocumented public stats endpoint. Shape observed 2026-09-14; treat fields as optional. */
export interface HyloStats {
  exchangeStats?: Record<string, unknown>
  stabilityPoolStats?: { lpTokenNav?: number } & Record<string, unknown>
  [k: string]: unknown
}

export async function fetchHyloStats(): Promise<HyloStats> {
  const res = await fetch(HYLO.statsUrl)
  if (!res.ok) throw new Error(`Hylo /stats ${res.status}`)
  return (await res.json()) as HyloStats
}

/** Anchor IDLs from github.com/hylo-so/sdk (hylo-idl/idls). Use with @coral-xyz/anchor or Codama codegen. */
export { default as hyloExchangeIdl } from "./idl/hylo_exchange.json" with { type: "json" }
export { default as hyloEarnPoolIdl } from "./idl/hylo_earn_pool.json" with { type: "json" }
export { default as hyloRouterIdl } from "./idl/hylo_router.json" with { type: "json" }
