"use client"

import * as React from "react"
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react"

import { client } from "@/app/providers"
import { signAndSend, signOnly, waitForConfirmation } from "@/lib/sign"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

type Market = {
  vaultAddress: string; tokenName: string; platformName: string; baseMint: string; decimals: number
  impliedApy: number; ytPriceInAsset: number; maturity: number; orderbook: string
}
type Stock = { address: string; symbol: string; name: string; decimals: number; icon?: string }
type Quote = {
  baseIn: string; ytOut: string; ytProceedsBase: string; stockOut: string; stockOutUsd: number | null
  maturity: string; impliedApy: number; ytPrice: number; baseMint: string; baseSymbol: string; decimals: number
}
type StepState = { label: string; status: "idle" | "running" | "done" | "error"; detail?: string }

const USDC_DEFAULT_VAULT = "Dy8bAHHbxkY87aZbSmycazWvui7kpLU6uAPkEkZA3fj5" // USX Dec 1

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json as T
}
const fmt = (raw: string | bigint, decimals: number, dp = 2) => (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: dp })

export function YieldPanel() {
  const connected = useConnectedWallet(client)
  const owner = connected?.account.address

  const [markets, setMarkets] = React.useState<Market[]>([])
  const [stocks, setStocks] = React.useState<Stock[]>([])
  const [vault, setVault] = React.useState(USDC_DEFAULT_VAULT)
  const [stock, setStock] = React.useState<string>("")
  const [usd, setUsd] = React.useState("10")

  React.useEffect(() => {
    api<Market[]>("/api/markets").then(setMarkets).catch(console.error)
    api<Stock[]>("/api/stocks").then((s) => { setStocks(s); setStock((cur) => cur || s.find((x) => x.symbol === "MSTR")?.address || s[0]?.address || "") }).catch(console.error)
  }, [])

  const market = markets.find((m) => m.vaultAddress === vault)
  const stockMeta = stocks.find((s) => s.address === stock)
  const usdcAmount = BigInt(Math.round((Number(usd) || 0) * 1e6))

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Turn yield into stocks</CardTitle>
        <CardDescription>Principal stays intact. Only the yield buys equity.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="usd">Deposit (USDC)</Label>
            <Input id="usd" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Stock</Label>
            <Select value={stock} onValueChange={(v) => v && setStock(String(v))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pick a stock" /></SelectTrigger>
              <SelectContent>
                {stocks.map((s) => (
                  <SelectItem key={s.address} value={s.address}>
                    <span className="font-mono">{s.symbol}</span><span className="text-muted-foreground truncate">{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Yield market (Exponent)</Label>
            <Select value={vault} onValueChange={(v) => v && setVault(String(v))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {markets.map((m) => (
                  <SelectItem key={m.vaultAddress} value={m.vaultAddress}>
                    <span className="font-mono">{m.tokenName}</span>
                    <span className="text-muted-foreground">{(m.impliedApy * 100).toFixed(1)}% · {new Date(m.maturity * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="now">
          <TabsList>
            <TabsTrigger value="now">Yield now</TabsTrigger>
            <TabsTrigger value="dca">Yield DCA</TabsTrigger>
          </TabsList>
          <TabsContent value="now" className="pt-4">
            {market && stockMeta ? (
              <YieldNow owner={owner} market={market} stock={stockMeta} usdcAmount={usdcAmount} />
            ) : <p className="text-muted-foreground text-sm">Loading markets…</p>}
          </TabsContent>
          <TabsContent value="dca" className="pt-4">
            {stockMeta ? <YieldDca owner={owner} stock={stockMeta} usdcAmount={usdcAmount} /> : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function Steps({ steps }: { steps: StepState[] }) {
  return (
    <ol className="grid gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          <Badge variant={s.status === "done" ? "default" : s.status === "error" ? "destructive" : "outline"} className="w-16 justify-center font-mono">
            {s.status === "idle" ? `${i + 1}` : s.status}
          </Badge>
          <span>{s.label}</span>
          {s.detail ? <span className="text-muted-foreground truncate font-mono text-xs">{s.detail}</span> : null}
        </li>
      ))}
    </ol>
  )
}

function useSteps(labels: string[]) {
  const [steps, setSteps] = React.useState<StepState[]>(labels.map((label) => ({ label, status: "idle" })))
  const set = (i: number, patch: Partial<StepState>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const reset = () => setSteps(labels.map((label) => ({ label, status: "idle" })))
  return { steps, set, reset }
}

function YieldNow({ owner, market, stock, usdcAmount }: { owner?: string; market: Market; stock: Stock; usdcAmount: bigint }) {
  const [quote, setQuote] = React.useState<Quote | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { steps, set, reset } = useSteps([
    `Swap USDC → ${market.tokenName} (Jupiter)`,
    `Strip ${market.tokenName} → PT + YT (Exponent)`,
    "Sell YT for base (Exponent orderbook)",
    `Buy ${stock.symbol} (Sunrise)`,
  ])

  React.useEffect(() => {
    if (usdcAmount <= 0n) return
    setLoading(true); setError(null)
    const t = setTimeout(() => {
      api<Quote>("/api/yield-now/quote", { usdcAmount: usdcAmount.toString(), vaultAddress: market.vaultAddress, stockMint: stock.address })
        .then(setQuote).catch((e) => setError(e.message)).finally(() => setLoading(false))
    }, 400)
    return () => clearTimeout(t)
  }, [usdcAmount, market.vaultAddress, stock.address])

  async function run() {
    if (!owner || !quote) return
    setRunning(true); setError(null); reset()
    try {
      // 1. USDC → base
      set(0, { status: "running" })
      const swap = await api<{ transaction: string; requestId: string; expectedOut: string }>("/api/yield-now/build", { step: "swap", owner, usdcAmount: usdcAmount.toString(), baseMint: market.baseMint })
      const signedSwap = await signOnly(swap.transaction)
      const swapRes = await api<{ status: string; signature?: string; error?: string }>("/api/yield-now/build", { step: "swap-execute", signedTransaction: signedSwap, requestId: swap.requestId })
      if (swapRes.status !== "Success" || !swapRes.signature) throw new Error(swapRes.error ?? "Swap failed")
      await waitForConfirmation(swapRes.signature as never)
      set(0, { status: "done", detail: swapRes.signature.slice(0, 8) })

      // 2. strip (conservative: 0.5% under expected fill)
      const amountBase = (BigInt(swap.expectedOut) * 995n) / 1000n
      set(1, { status: "running" })
      const strip = await api<{ transaction: string }>("/api/yield-now/build", { step: "strip", owner, vaultAddress: market.vaultAddress, amountBase: amountBase.toString() })
      const stripSig = await signAndSend(strip.transaction)
      await waitForConfirmation(stripSig)
      set(1, { status: "done", detail: stripSig.slice(0, 8) })

      // 3. sell all YT
      const minBaseOut = (BigInt(Math.floor(Number(amountBase) * quote.ytPrice)) * 90n) / 100n
      set(2, { status: "running" })
      const sell = await api<{ transaction: string }>("/api/yield-now/build", { step: "sell-yt", owner, vaultAddress: market.vaultAddress, orderbook: market.orderbook, ytAmount: amountBase.toString(), minBaseOut: minBaseOut.toString(), maxPriceApy: market.impliedApy * 1.5 })
      const sellSig = await signAndSend(sell.transaction)
      await waitForConfirmation(sellSig)
      set(2, { status: "done", detail: sellSig.slice(0, 8) })

      // 4. base → stock
      set(3, { status: "running" })
      const buy = await api<{ transaction: string; quoteId: string; routeName: string; providerRequestId?: string; toAmount: string }>("/api/yield-now/build", { step: "buy-stock", owner, fromMint: market.baseMint, amount: minBaseOut.toString(), stockMint: stock.address })
      const signedBuy = await signOnly(buy.transaction)
      await api("/api/yield-now/build", { step: "buy-stock-execute", signedTransaction: signedBuy, quoteId: buy.quoteId, routeName: buy.routeName, providerRequestId: buy.providerRequestId })
      set(3, { status: "done", detail: `${fmt(buy.toAmount, stock.decimals, 4)} ${stock.symbol}` })
    } catch (e) {
      const i = steps.findIndex((s) => s.status === "running")
      if (i >= 0) set(i, { status: "error" })
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-3 text-sm">
        <Row k="You deposit" v={`${fmt(usdcAmount, 6)} USDC`} />
        <Row k={`Swapped to ${market.tokenName}`} v={quote ? `${fmt(quote.baseIn, quote.decimals)} ${quote.baseSymbol}` : "…"} />
        <Row k="YT sells for" v={quote ? `${fmt(quote.ytProceedsBase, quote.decimals)} ${quote.baseSymbol}  (${(quote.ytPrice * 100).toFixed(2)}% of principal)` : "…"} />
        <Row k={`${stock.symbol} today`} v={quote ? `${fmt(quote.stockOut, stock.decimals, 4)} sh ≈ $${quote.stockOutUsd?.toFixed(2) ?? "?"}` : "…"} strong />
        <Row k="Principal back" v={quote ? `${fmt(quote.baseIn, quote.decimals)} ${quote.baseSymbol} on ${new Date(quote.maturity).toLocaleDateString()}` : "…"} />
        <Row k="Implied APY" v={`${(market.impliedApy * 100).toFixed(2)}%`} />
        {error ? <p className="text-destructive">{error}</p> : null}
        <Button onClick={run} disabled={!owner || !quote || loading || running || usdcAmount <= 0n} className="mt-2 w-fit">
          {!owner ? "Connect wallet" : running ? "Running…" : `Buy ${stock.symbol} with yield`}
        </Button>
      </div>
      <Steps steps={steps} />
    </div>
  )
}

function YieldDca({ owner, stock, usdcAmount }: { owner?: string; stock: Stock; usdcAmount: bigint }) {
  const [principal, setPrincipal] = React.useState<bigint>(0n)
  const [pos, setPos] = React.useState<{ balance: string; harvestable: string } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<"deposit" | "harvest" | null>(null)
  const { steps, set, reset } = useSteps(["Deposit USDC → JupLend", "Harvest interest", `Buy ${stock.symbol} (Sunrise)`])

  const refresh = React.useCallback(async () => {
    if (!owner) return
    try { setPos(await api(`/api/yield-dca/position?owner=${owner}&principal=${principal}`)) } catch (e) { setError((e as Error).message) }
  }, [owner, principal])
  React.useEffect(() => { void refresh() }, [refresh])

  async function deposit() {
    if (!owner) return
    setBusy("deposit"); setError(null); reset(); set(0, { status: "running" })
    try {
      const { transaction } = await api<{ transaction: string }>("/api/yield-dca/build", { step: "deposit", owner, usdcAmount: usdcAmount.toString() })
      const sig = await signAndSend(transaction); await waitForConfirmation(sig)
      setPrincipal((p) => p + usdcAmount); set(0, { status: "done", detail: sig.slice(0, 8) })
    } catch (e) { set(0, { status: "error" }); setError((e as Error).message) } finally { setBusy(null) }
  }

  async function harvest() {
    if (!owner || !pos) return
    const amt = BigInt(pos.harvestable)
    if (amt <= 0n) { setError("Nothing to harvest yet"); return }
    setBusy("harvest"); setError(null); set(1, { status: "running" })
    try {
      const h = await api<{ transaction: string }>("/api/yield-dca/build", { step: "harvest", owner, amountUsdc: amt.toString() })
      const sig = await signAndSend(h.transaction); await waitForConfirmation(sig)
      set(1, { status: "done", detail: `${fmt(amt, 6, 4)} USDC` }); set(2, { status: "running" })
      const buy = await api<{ transaction: string; quoteId: string; routeName: string; providerRequestId?: string; toAmount: string }>("/api/yield-dca/build", { step: "buy-stock", owner, amountUsdc: amt.toString(), stockMint: stock.address })
      const signed = await signOnly(buy.transaction)
      await api("/api/yield-now/build", { step: "buy-stock-execute", signedTransaction: signed, quoteId: buy.quoteId, routeName: buy.routeName, providerRequestId: buy.providerRequestId })
      set(2, { status: "done", detail: `${fmt(buy.toAmount, stock.decimals, 4)} ${stock.symbol}` })
      await refresh()
    } catch (e) { set(steps.findIndex((s) => s.status === "running"), { status: "error" }); setError((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-3 text-sm">
        <Row k="Principal in JupLend" v={pos ? `${fmt(pos.balance, 6)} USDC` : "—"} />
        <Row k="Harvestable yield" v={pos ? `${fmt(pos.harvestable, 6, 4)} USDC` : "—"} strong />
        <Row k="Goes into" v={stock.symbol} />
        <p className="text-muted-foreground">Deposit once. Each harvest sends only the interest into {stock.symbol}. Principal never moves.</p>
        {error ? <p className="text-destructive">{error}</p> : null}
        <div className="mt-2 flex gap-2">
          <Button onClick={deposit} disabled={!owner || busy !== null || usdcAmount <= 0n}>{busy === "deposit" ? "Depositing…" : `Deposit ${fmt(usdcAmount, 6)} USDC`}</Button>
          <Button variant="outline" onClick={harvest} disabled={!owner || busy !== null || !pos || BigInt(pos.harvestable) <= 0n}>{busy === "harvest" ? "Harvesting…" : "Harvest → buy"}</Button>
        </div>
      </div>
      <Steps steps={steps} />
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={strong ? "font-heading text-base" : "font-mono"}>{v}</span>
    </div>
  )
}
