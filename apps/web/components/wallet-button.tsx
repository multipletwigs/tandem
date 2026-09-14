"use client"

import { useConnect, useConnectedWallet, useDisconnect, useWallets, WalletReadyGate } from "@solana/kit-plugin-wallet/react"

import { client } from "@/app/providers"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

function Inner() {
  const wallets = useWallets(client)
  const connected = useConnectedWallet(client)
  const { dispatch: connect, isRunning: connecting } = useConnect(client)
  const { dispatch: disconnect } = useDisconnect(client)

  if (connected) {
    const a = connected.account.address
    return (
      <Button variant="outline" size="sm" className="font-mono" onClick={() => disconnect()}>
        {a.slice(0, 4)}…{a.slice(-4)}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" disabled={connecting || wallets.length === 0} />}>
        {wallets.length === 0 ? "No wallet found" : connecting ? "Connecting…" : "Connect wallet"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {wallets.map((w) => (
          <DropdownMenuItem key={w.name} onClick={() => connect(w)}>
            {w.icon ? <img src={w.icon} alt="" className="size-4" /> : null}
            {w.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function WalletButton() {
  return (
    <WalletReadyGate client={client} fallback={<Button size="sm" variant="outline" disabled>Wallets…</Button>}>
      <Inner />
    </WalletReadyGate>
  )
}
