"use client"

import { createClient } from "@solana/kit"
import { solanaRpc } from "@solana/kit-plugin-rpc"
import { walletSigner } from "@solana/kit-plugin-wallet"
import { ClientProvider } from "@solana/react"

// Browser → /api/rpc → Helius. SSR fallback is only used for type-level instantiation.
const rpcUrl =
  typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : "https://api.mainnet-beta.solana.com"

export const client = createClient()
  .use(walletSigner({ chain: "solana:mainnet" }))
  .use(solanaRpc({ rpcUrl }))

export type AppClient = typeof client

export function Providers({ children }: { children: React.ReactNode }) {
  return <ClientProvider client={client}>{children}</ClientProvider>
}
