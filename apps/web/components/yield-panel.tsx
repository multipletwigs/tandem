"use client"

import * as React from "react"
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react"
import { ArrowRightIcon, CheckIcon, CircleNotchIcon, WarningIcon, ArrowSquareOutIcon } from "@phosphor-icons/react"

import { client } from "@/app/providers"
import { signAndSend, signOnly, waitForConfirmation } from "@/lib/sign"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

// ----------------------------------------------------------------------------
// types + helpers
// ----------------------------------------------------------------------------

type Market = {
  vaultAddress: string; tokenName: string; platformName: string; baseMint: string; decimals: number
  impliedApy: number; ytPriceInAsset: number; maturity: number; orderbook: string
}
type Stock = { address: string; symbol: string; name: string; decimals: number; icon?: string }
type Quote = {
  baseIn: string; ytOut: string; ytProceedsBase: string; stockOut: string; stockOutUsd: number | null
  maturity: string; impliedApy: number; ytPrice: number; baseMint: string; baseSymbol: string; decimals: number
}
type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error"
type Step = {
  title: string
  /** plain-English "what happens" */
  what: string
  /** who executes it */
  via: string
  /** in → out preview, filled from the quote */
  input?: string
  output?: string
  status: Status
  signature?: string
  error?: string
}

const DEFAULT_VAULT = "Dy8bAHHbxkY87aZbSmycazWvui7kpLU6uAPkEkZA3fj5" // USX · Dec 1
const STATUS_LABEL: Record<Status, string> = {
  idle: "", building: "Building tx", signing: "Sign in wallet", confirming: "Confirming", done: "Done", error: "Failed",
}

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json as T
}
const fmt = (raw: string | bigint | number, decimals: number, dp = 2) =>
  (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: dp })
const pct = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`
const date = (d: string | number) => new Date(typeof d === "number" ? d * 1000 : d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })

function useSteps(initial: Omit<Step, "status">[]) {
  const [steps, setSteps] = React.useState<Step[]>(initial.map((s) => ({ ...s, status: "idle" })))
  const update = React.useCallback((i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x))), [])
  const reset = React.useCallback(() => setSteps((s) => s.map((x) => ({ ...x, status: "idle", signature: undefined, error: undefined }))), [])
  const preview = React.useCallback((io: { input?: string; output?: string }[]) => setSteps((s) => s.map((x, i) => ({ ...x, ...io[i] }))), [])
  return { steps, update, reset, preview }
}

// ----------------------------------------------------------------------------
// panel
// ----------------------------------------------------------------------------

export function YieldPanel() {
  const connected = useConnectedWallet(client)
  const owner = connected?.account.address

  const [markets, setMarkets] = React.useState<Market[]>([])
  const [stocks, setStocks] = React.useState<Stock[]>([])
  const [vault, setVault] = React.useState(DEFAULT_VAULT)
  const [stock, setStock] = React.useState("")
  const [usd, setUsd] = React.useState("10")

  React.useEffect(() => {
    api<Market[]>("/api/markets").then(setMarkets).catch(console.error)
    api<Stock[]>("/api/stocks")
      .then((s) => { setStocks(s); setStock((cur) => cur || s.find((x) => x.symbol === "MSTR")?.address || s[0]?.address || "") })
      .catch(console.error)
  }, [])

  const market = markets.find((m) => m.vaultAddress === vault)
  const stockMeta = stocks.find((s) => s.address === stock)
  const usdcAmount = BigInt(Math.round((Number(usd) || 0) * 1e6))

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2 *:min-w-0">
          <div className="grid gap-2">
            <Label htmlFor="usd">Deposit (USDC)</Label>
            <Input id="usd" inputMode="decimal" className="font-mono" value={usd} onChange={(e) => setUsd(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Stock to buy</Label>
            <Select value={stock} onValueChange={(v) => v && setStock(String(v))}>
              <SelectTrigger className="w-full max-w-full overflow-hidden">
                <SelectValue placeholder="Pick a stock">
                  {(v: string | null) => { const s = stocks.find((x) => x.address === v); return s ? <><span className="font-mono">{s.symbol}</span><span className="text-muted-foreground truncate">{s.name}</span></> : null }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stocks.map((s) => (
                  <SelectItem key={s.address} value={s.address}>
                    <span className="font-mono">{s.symbol}</span>
                    <span className="text-muted-foreground truncate">{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="now">
        <TabsList className="w-full md:w-fit">
          <TabsTrigger value="now">Yield now</TabsTrigger>
          <TabsTrigger value="dca">Yield DCA</TabsTrigger>
        </TabsList>
        <TabsContent value="now" className="pt-4">
          {market && stockMeta
            ? <YieldNow owner={owner} market={market} markets={markets} onMarket={setVault} stock={stockMeta} usdcAmount={usdcAmount} />
            : <p className="text-muted-foreground text-sm">Loading markets…</p>}
        </TabsContent>
        <TabsContent value="dca" className="pt-4">
          {stockMeta ? <YieldDca owner={owner} stock={stockMeta} usdcAmount={usdcAmount} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ----------------------------------------------------------------------------
// step list
// ----------------------------------------------------------------------------

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid">
      {steps.map((s, i) => {
        const active = s.status !== "idle" && s.status !== "done" && s.status !== "error"
        return (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 ? <span className="bg-border absolute top-8 left-[15px] h-[calc(100%-2rem)] w-px" aria-hidden /> : null}
            <span
              className={cn(
                "font-heading flex size-8 shrink-0 items-center justify-center border text-sm",
                s.status === "done" && "bg-primary text-primary-foreground border-primary",
                s.status === "error" && "bg-destructive text-destructive-foreground border-destructive",
                active && "border-primary text-primary",
              )}
            >
              {s.status === "done" ? <CheckIcon weight="bold" /> : s.status === "error" ? <WarningIcon weight="bold" /> : active ? <CircleNotchIcon className="animate-spin" /> : i + 1}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-medium">{s.title}</span>
                <span className={cn("font-mono text-xs", s.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                  {STATUS_LABEL[s.status] || s.via}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{s.what}</p>
              {s.input || s.output ? (
                <p className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span>{s.input}</span>
                  <ArrowRightIcon className="text-muted-foreground size-3" />
                  <span className="text-foreground">{s.output}</span>
                </p>
              ) : null}
              {s.signature ? (
                <a href={`https://solscan.io/tx/${s.signature}`} target="_blank" rel="noreferrer" className="text-muted-foreground inline-flex items-center gap-1 font-mono text-xs underline-offset-4 hover:underline">
                  {s.signature.slice(0, 8)}…{s.signature.slice(-8)} <ArrowSquareOutIcon className="size-3" />
                </a>
              ) : null}
              {s.error ? <p className="text-destructive text-xs">{s.error}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Summary({ rows }: { rows: { k: string; v: string; strong?: boolean }[] }) {
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map((r) => (
        <div key={r.k} className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2 last:border-0">
          <dt className="text-muted-foreground">{r.k}</dt>
          <dd className={cn("text-right", r.strong ? "font-heading text-base" : "font-mono")}>{r.v}</dd>
        </div>
      ))}
    </dl>
  )
}

// ----------------------------------------------------------------------------
// Flow A — yield now
// ----------------------------------------------------------------------------

function YieldNow({ owner, market, markets, onMarket, stock, usdcAmount }: {
  owner?: string; market: Market; markets: Market[]; onMarket: (v: string) => void; stock: Stock; usdcAmount: bigint
}) {
  const [quote, setQuote] = React.useState<Quote | null>(null)
  const [quoting, setQuoting] = React.useState(false)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const base = market.tokenName
  const { steps, update, reset, preview } = useSteps([
    { title: `Swap USDC for ${base}`, what: `Exponent's ${base} market only accepts ${base}, so the deposit is swapped first.`, via: "Jupiter" },
    { title: `Split ${base} into principal + yield`, what: `${base} is stripped into PT (redeems 1:1 at maturity) and YT (all the yield until then).`, via: "Exponent" },
    { title: "Sell the yield token", what: `The YT is sold now for the present value of ${date(market.maturity)}'s interest.`, via: "Exponent orderbook" },
    { title: `Buy ${stock.symbol}`, what: `The yield proceeds buy ${stock.name} shares, delivered to your wallet.`, via: "Sunrise" },
  ])

  React.useEffect(() => {
    if (usdcAmount <= 0n) return
    const t = setTimeout(() => {
      setQuoting(true); setError(null)
      api<Quote>("/api/yield-now/quote", { usdcAmount: usdcAmount.toString(), vaultAddress: market.vaultAddress, stockMint: stock.address })
        .then((q) => {
          setQuote(q)
          const b = q.baseSymbol
          preview([
            { input: `${fmt(usdcAmount, 6)} USDC`, output: `${fmt(q.baseIn, q.decimals)} ${b}` },
            { input: `${fmt(q.baseIn, q.decimals)} ${b}`, output: `${fmt(q.ytOut, q.decimals)} PT + ${fmt(q.ytOut, q.decimals)} YT` },
            { input: `${fmt(q.ytOut, q.decimals)} YT`, output: `${fmt(q.ytProceedsBase, q.decimals, 4)} ${b}` },
            { input: `${fmt(q.ytProceedsBase, q.decimals, 4)} ${b}`, output: `${fmt(q.stockOut, stock.decimals, 4)} ${stock.symbol}` },
          ])
        })
        .catch((e) => setError(e.message))
        .finally(() => setQuoting(false))
    }, 400)
    return () => clearTimeout(t)
  }, [usdcAmount, market.vaultAddress, stock.address, stock.symbol, stock.decimals, preview])

  async function run() {
    if (!owner || !quote) return
    setRunning(true); setError(null); reset()
    let i = 0
    try {
      // 1 — swap
      update(i, { status: "building" })
      const swap = await api<{ transaction: string; requestId: string; expectedOut: string }>("/api/yield-now/build", { step: "swap", owner, usdcAmount: usdcAmount.toString(), baseMint: market.baseMint })
      update(i, { status: "signing" })
      const signedSwap = await signOnly(swap.transaction)
      update(i, { status: "confirming" })
      const swapRes = await api<{ status: string; signature?: string; error?: string }>("/api/yield-now/build", { step: "swap-execute", signedTransaction: signedSwap, requestId: swap.requestId })
      if (swapRes.status !== "Success" || !swapRes.signature) throw new Error(swapRes.error ?? "Swap failed")
      await waitForConfirmation(swapRes.signature as never)
      update(i, { status: "done", signature: swapRes.signature })

      // 2 — strip (0.5% under expected fill so the tx never asks for more than arrived)
      i = 1
      const amountBase = (BigInt(swap.expectedOut) * 995n) / 1000n
      update(i, { status: "building" })
      const strip = await api<{ transaction: string }>("/api/yield-now/build", { step: "strip", owner, vaultAddress: market.vaultAddress, amountBase: amountBase.toString() })
      update(i, { status: "signing" })
      const stripSig = await signAndSend(strip.transaction)
      update(i, { status: "confirming", signature: stripSig })
      await waitForConfirmation(stripSig)
      update(i, { status: "done" })

      // 3 — sell YT
      i = 2
      const minBaseOut = (BigInt(Math.floor(Number(amountBase) * quote.ytPrice)) * 90n) / 100n
      update(i, { status: "building" })
      const sell = await api<{ transaction: string }>("/api/yield-now/build", { step: "sell-yt", owner, vaultAddress: market.vaultAddress, orderbook: market.orderbook, ytAmount: amountBase.toString(), minBaseOut: minBaseOut.toString(), maxPriceApy: market.impliedApy * 1.5 })
      update(i, { status: "signing" })
      const sellSig = await signAndSend(sell.transaction)
      update(i, { status: "confirming", signature: sellSig })
      await waitForConfirmation(sellSig)
      update(i, { status: "done" })

      // 4 — buy stock
      i = 3
      update(i, { status: "building" })
      const buy = await api<{ transaction: string; quoteId: string; routeName: string; providerRequestId?: string; toAmount: string }>("/api/yield-now/build", { step: "buy-stock", owner, fromMint: market.baseMint, amount: minBaseOut.toString(), stockMint: stock.address })
      update(i, { status: "signing" })
      const signedBuy = await signOnly(buy.transaction)
      update(i, { status: "confirming" })
      const exec = await api<{ signature?: string; txHash?: string }>("/api/yield-now/build", { step: "buy-stock-execute", signedTransaction: signedBuy, quoteId: buy.quoteId, routeName: buy.routeName, providerRequestId: buy.providerRequestId })
      update(i, { status: "done", signature: exec.signature ?? exec.txHash, output: `${fmt(buy.toAmount, stock.decimals, 4)} ${stock.symbol}` })
    } catch (e) {
      update(i, { status: "error", error: (e as Error).message })
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Yield now</CardTitle>
          <CardDescription>Sell a year of interest today. Keep the principal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Yield market <span className="text-muted-foreground font-normal">(Exponent)</span></Label>
            <Select value={market.vaultAddress} onValueChange={(v) => v && onMarket(String(v))}>
              <SelectTrigger className="w-full max-w-full overflow-hidden">
                <SelectValue>
                  {(v: string | null) => { const m = markets.find((x) => x.vaultAddress === v); return m ? <><span className="font-mono">{m.tokenName}</span><span className="text-muted-foreground">{pct(m.impliedApy)} · {date(m.maturity)}</span></> : null }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {markets.map((m) => (
                  <SelectItem key={m.vaultAddress} value={m.vaultAddress}>
                    <span className="font-mono">{m.tokenName}</span>
                    <span className="text-muted-foreground">{pct(m.impliedApy)} · {date(m.maturity)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Summary rows={[
            { k: "You deposit", v: `${fmt(usdcAmount, 6)} USDC` },
            { k: "Yield sold for", v: quote ? `${fmt(quote.ytProceedsBase, quote.decimals, 4)} ${quote.baseSymbol}` : "…" },
            { k: `${stock.symbol} in your wallet`, v: quote ? `${fmt(quote.stockOut, stock.decimals, 4)} sh ≈ $${quote.stockOutUsd?.toFixed(2) ?? "?"}` : "…", strong: true },
            { k: "Principal back", v: quote ? `${fmt(quote.baseIn, quote.decimals)} ${quote.baseSymbol} · ${date(quote.maturity)}` : "…" },
            { k: "Implied APY", v: pct(market.impliedApy, 2) },
          ]} />
          {error && !running ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button onClick={run} disabled={!owner || !quote || quoting || running || usdcAmount <= 0n} className="w-full">
            {!owner ? "Connect a wallet to start" : running ? "Running…" : quoting ? "Quoting…" : `Buy ${stock.symbol} with yield · 4 signatures`}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">What happens</CardTitle>
          <CardDescription>Each step is one transaction you sign in your wallet.</CardDescription>
        </CardHeader>
        <CardContent><StepList steps={steps} /></CardContent>
      </Card>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Flow B — yield DCA
// ----------------------------------------------------------------------------

function YieldDca({ owner, stock, usdcAmount }: { owner?: string; stock: Stock; usdcAmount: bigint }) {
  const [principal, setPrincipal] = React.useState(0n)
  const [pos, setPos] = React.useState<{ balance: string; harvestable: string } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<"deposit" | "harvest" | null>(null)
  const { steps, update, reset } = useSteps([
    { title: "Park the principal", what: "USDC goes into JupLend and starts earning. It never leaves unless you withdraw it.", via: "JupLend" },
    { title: "Harvest the interest", what: "Only the yield above the principal is withdrawn.", via: "JupLend" },
    { title: `Buy ${stock.symbol}`, what: `Harvested USDC buys ${stock.name} shares. Repeat whenever yield has accrued.`, via: "Sunrise" },
  ])

  const refresh = React.useCallback(async () => {
    if (!owner) return
    try { setPos(await api(`/api/yield-dca/position?owner=${owner}&principal=${principal}`)) } catch (e) { setError((e as Error).message) }
  }, [owner, principal])
  React.useEffect(() => { void refresh() }, [refresh])

  async function deposit() {
    if (!owner) return
    setBusy("deposit"); setError(null); reset()
    try {
      update(0, { status: "building", input: `${fmt(usdcAmount, 6)} USDC`, output: "jlUSDC" })
      const { transaction } = await api<{ transaction: string }>("/api/yield-dca/build", { step: "deposit", owner, usdcAmount: usdcAmount.toString() })
      update(0, { status: "signing" })
      const sig = await signAndSend(transaction)
      update(0, { status: "confirming", signature: sig })
      await waitForConfirmation(sig)
      setPrincipal((p) => p + usdcAmount)
      update(0, { status: "done" })
    } catch (e) { update(0, { status: "error", error: (e as Error).message }); setError((e as Error).message) } finally { setBusy(null) }
  }

  async function harvest() {
    if (!owner || !pos) return
    const amt = BigInt(pos.harvestable)
    if (amt <= 0n) { setError("Nothing to harvest yet"); return }
    setBusy("harvest"); setError(null)
    let i = 1
    try {
      update(1, { status: "building", input: `${fmt(amt, 6, 4)} USDC interest`, output: "USDC in wallet" })
      const h = await api<{ transaction: string }>("/api/yield-dca/build", { step: "harvest", owner, amountUsdc: amt.toString() })
      update(1, { status: "signing" })
      const sig = await signAndSend(h.transaction)
      update(1, { status: "confirming", signature: sig })
      await waitForConfirmation(sig)
      update(1, { status: "done" })
      i = 2
      update(2, { status: "building" })
      const buy = await api<{ transaction: string; quoteId: string; routeName: string; providerRequestId?: string; toAmount: string }>("/api/yield-dca/build", { step: "buy-stock", owner, amountUsdc: amt.toString(), stockMint: stock.address })
      update(2, { status: "signing", input: `${fmt(amt, 6, 4)} USDC`, output: `${fmt(buy.toAmount, stock.decimals, 4)} ${stock.symbol}` })
      const signed = await signOnly(buy.transaction)
      update(2, { status: "confirming" })
      const exec = await api<{ signature?: string; txHash?: string }>("/api/yield-now/build", { step: "buy-stock-execute", signedTransaction: signed, quoteId: buy.quoteId, routeName: buy.routeName, providerRequestId: buy.providerRequestId })
      update(2, { status: "done", signature: exec.signature ?? exec.txHash })
      await refresh()
    } catch (e) { update(i, { status: "error", error: (e as Error).message }); setError((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Yield DCA</CardTitle>
          <CardDescription>Deposit once. Every harvest turns interest into shares.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Summary rows={[
            { k: "Principal in JupLend", v: pos ? `${fmt(pos.balance, 6)} USDC` : "—" },
            { k: "Harvestable now", v: pos ? `${fmt(pos.harvestable, 6, 4)} USDC` : "—", strong: true },
            { k: "Buys", v: `${stock.symbol} · ${stock.name}` },
          ]} />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="grid gap-2">
            <Button onClick={deposit} disabled={!owner || busy !== null || usdcAmount <= 0n}>
              {!owner ? "Connect a wallet to start" : busy === "deposit" ? "Depositing…" : `Deposit ${fmt(usdcAmount, 6)} USDC · 1 signature`}
            </Button>
            <Button variant="outline" onClick={harvest} disabled={!owner || busy !== null || !pos || BigInt(pos.harvestable) <= 0n}>
              {busy === "harvest" ? "Harvesting…" : `Harvest → buy ${stock.symbol} · 2 signatures`}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">What happens</CardTitle>
          <CardDescription>Principal never moves. Only interest is spent.</CardDescription>
        </CardHeader>
        <CardContent><StepList steps={steps} /></CardContent>
      </Card>
    </div>
  )
}
