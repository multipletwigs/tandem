import { Connection } from "@solana/web3.js"

/** Browser: goes through /api/rpc. Server: talks to Helius directly. */
export function getRpcUrl() {
  if (typeof window !== "undefined") return `${window.location.origin}/api/rpc`
  return process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com"
}

export function getConnection() {
  return new Connection(getRpcUrl(), "confirmed")
}
