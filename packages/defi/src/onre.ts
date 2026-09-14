import { ONRE } from "./addresses"
import onreIdl from "./idl/onre.json" with { type: "json" }

/** Anchor IDL for the OnRe program (onre-finance/onre-sol, master). Use with @coral-xyz/anchor. */
export { onreIdl }

/** https://docs.onre.finance — live APY as a fraction (0.1154 = 11.54%). */
export async function fetchOnreLiveApy(): Promise<number> {
  const res = await fetch(`${ONRE.apiBase}/data/live-apy`)
  if (!res.ok) throw new Error(`OnRe /data/live-apy ${res.status}`)
  return Number(await res.text())
}

export async function fetchOnreLiveNav(): Promise<number> {
  const res = await fetch(`${ONRE.apiBase}/data/live-nav`)
  if (!res.ok) throw new Error(`OnRe /data/live-nav ${res.status}`)
  return Number(await res.text())
}
