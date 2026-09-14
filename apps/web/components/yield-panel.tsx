"use client"

import * as React from "react"
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react"
import { ArrowRightIcon, CheckIcon, CircleNotchIcon, WarningIcon, ArrowSquareOutIcon } from "@phosphor-icons/react"

import { client } from "@/app/providers"
import { signAndSend, signOnly, waitForConfirmation } from "@/lib/sign"
import { cn } from "@workspace/ui/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
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
  swapPriceImpact: number; ytExecutable: boolean; ytBidDepth: string; ytBidCount: number
}
type Pool = { id: string; source: "juplend" | "kamino" | "loopscale"; name: string; apy: number; tvlUsd?: number; meta: Record<string, string | undefined> }
type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error"
type StepDef = { title: string; what: string; via: string; input?: string; output?: string }
type StepState = { status: Status; signature?: string; error?: string; output?: string }

const DEFAULT_VAULT = "Dy8bAHHbxkY87aZbSmycazWvui7kpLU6uAPkEkZA3fj5" // USX · Dec 1
const MAX_PRICE_IMPACT = -0.01
const STATUS_LABEL: Record<Status, string> = { idle: "", building: "Building tx", signing: "Sign in wallet", confirming: "Confirming", done: "Done", error: "Failed" }
const SOURCE_LABEL = { juplend: "JupLend", kamino: "Kamino", loopscale: "Loopscale" } as const

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json as T
}
const fmt = (raw: string | bigint | number, decimals: number, dp = 2) =>
  (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: dp })
const usd = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 })
const pct = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`
const date = (d: string | number) => new Date(typeof d === "number" ? d * 1000 : d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })

function useStepState(n: number) {
  const [state, setState] = React.useState<StepState[]>(() => Array.from({ length: n }, () => ({ status: "idle" })))
  const update = React.useCallback((i: number, patch: Partial<StepState>) => setState((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x))), [])
  const reset = React.useCallback(() => setState(Array.from({ length: n }, () => ({ status: "idle" }))), [n])
  return { state, update, reset }
}

// ----------------------------------------------------------------------------
// panel
// ----------------------------------------------------------------------------

export function YieldPanel() {
  const connected = useConnectedWallet(client)
  const owner = connected?.account.address

  const [markets, setMarkets] = React.useState<Market[]>([])
  const [stocks, setStocks] = React.useState<Stock[]>([])
  const [pools, setPools] = React.useState<Pool[]>([])
  const [vault, setVault] = React.useState(DEFAULT_VAULT)
  const [poolId, setPoolId] = React.useState("")
  const [stock, setStock] = React.useState("")
  const [usdIn, setUsdIn] = React.useState("10")

  React.useEffect(() => {
    api<Market[]>("/api/markets").then(setMarkets).catch(console.error)
    api<Stock[]>("/api/stocks")
      .then((s) => { setStocks(s); setStock((cur) => cur || s.find((x) => x.symbol === "MSTR")?.address || s[0]?.address || "") })
      .catch(console.error)
    api<Pool[]>("/api/dca/pools")
      .then((p) => { setPools(p); setPoolId((cur) => cur || p.find((x) => x.source === "juplend")?.id || p[0]?.id || "") })
      .catch(console.error)
  }, [])

  const market = markets.find((m) => m.vaultAddress === vault)
  const pool = pools.find((p) => p.id === poolId)
  const stockMeta = stocks.find((s) => s.address === stock)
  const usdcAmount = BigInt(Math.round((Number(usdIn) || 0) * 1e6))

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2 *:min-w-0">
          <div className="grid gap-2">
            <Label htmlFor="usd">Deposit</Label>
            <div className="relative">
              <Input id="usd" inputMode="decimal" className="h-11 pr-16 font-mono text-base" value={usdIn} onChange={(e) => setUsdIn(e.target.value)} />
              <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-sm">USDC</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Stock to buy</Label>
            <Select value={stock} onValueChange={(v) => v && setStock(String(v))}>
              <SelectTrigger className="h-11 w-full max-w-full overflow-hidden">
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
          {pool && stockMeta
            ? <YieldDca owner={owner} pool={pool} pools={pools} onPool={setPoolId} stock={stockMeta} usdcAmount={usdcAmount} />
            : <p className="text-muted-foreground text-sm">Loading pools…</p>}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ----------------------------------------------------------------------------
// shared pieces
// ----------------------------------------------------------------------------

function Hero({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-b pb-4">
      <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">{label}</p>
      <p className="font-heading mt-1 text-3xl leading-none">{value}</p>
      {sub ? <p className="text-muted-foreground mt-1 font-mono text-sm">{sub}</p> : null}
    </div>
  )
}

function Tiles({ items }: { items: { k: string; v: string; sub?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px bg-border">
      {items.map((t) => (
        <div key={t.k} className="bg-card grid gap-0.5 p-3">
          <dt className="text-muted-foreground font-mono text-[11px] uppercase tracking-wider">{t.k}</dt>
          <dd className="font-mono text-sm">{t.v}</dd>
          {t.sub ? <dd className="text-muted-foreground text-xs">{t.sub}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

function StepList({ defs, state }: { defs: StepDef[]; state: StepState[] }) {
  return (
    <ol className="grid">
      {defs.map((d, i) => {
        const s = state[i] ?? { status: "idle" as Status }
        const active = s.status !== "idle" && s.status !== "done" && s.status !== "error"
        return (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {i < defs.length - 1 ? <span className="bg-border absolute top-8 left-[15px] h-[calc(100%-2rem)] w-px" aria-hidden /> : null}
            <span className={cn(
              "font-heading flex size-8 shrink-0 items-center justify-center border text-sm",
              s.status === "done" && "bg-primary text-primary-foreground border-primary",
              s.status === "error" && "bg-destructive text-destructive-foreground border-destructive",
              active && "border-primary text-primary",
            )}>
              {s.status === "done" ? <CheckIcon weight="bold" /> : s.status === "error" ? <WarningIcon weight="bold" /> : active ? <CircleNotchIcon className="animate-spin" /> : i + 1}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-medium">{d.title}</span>
                <span className={cn("font-mono text-xs", s.status === "error" ? "text-destructive" : "text-muted-foreground")}>{STATUS_LABEL[s.status] || d.via}</span>
              </div>
              <p className="text-muted-foreground text-sm leading-snug">{d.what}</p>
              {d.input || d.output ? (
                <p className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span>{d.input}</span>
                  <ArrowRightIcon className="text-muted-foreground size-3" />
                  <span>{s.output ?? d.output}</span>
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
  const { state, update, reset } = useStepState(4)
  const base = market.tokenName
  const q = quote?.baseMint === market.baseMint ? quote : null // ignore stale quotes after a market switch

  const defs: StepDef[] = [
    { title: `Swap USDC for ${base}`, what: `Exponent's ${base} market only accepts ${base}, so the deposit is swapped first.`, via: "Jupiter",
      input: `${fmt(usdcAmount, 6)} USDC`, output: q ? `${fmt(q.baseIn, q.decimals)} ${base}` : "…" },
    { title: `Split ${base} into principal + yield`, what: `${base} is stripped into PT (redeems 1:1 on ${date(market.maturity)}) and YT (all the yield until then).`, via: "Exponent",
      input: q ? `${fmt(q.baseIn, q.decimals)} ${base}` : "…", output: q ? `${fmt(q.ytOut, q.decimals)} PT + ${fmt(q.ytOut, q.decimals)} YT` : "…" },
    { title: "Sell the yield token", what: `The YT is sold to the ${q?.ytBidCount ?? "—"} resting bids for the present value of the interest.`, via: "Exponent orderbook",
      input: q ? `${fmt(q.ytOut, q.decimals)} YT` : "…", output: q ? `${fmt(q.ytProceedsBase, q.decimals, 4)} ${base}` : "…" },
    { title: `Buy ${stock.symbol}`, what: `The yield proceeds buy ${stock.name}, delivered to your wallet.`, via: "Sunrise",
      input: q ? `${fmt(q.ytProceedsBase, q.decimals, 4)} ${base}` : "…", output: q ? `${fmt(q.stockOut, stock.decimals, 4)} ${stock.symbol}` : "…" },
  ]

  React.useEffect(() => {
    if (usdcAmount <= 0n) return
    const t = setTimeout(() => {
      setQuoting(true); setError(null)
      api<Quote>("/api/yield-now/quote", { usdcAmount: usdcAmount.toString(), vaultAddress: market.vaultAddress, stockMint: stock.address })
        .then(setQuote).catch((e) => setError(e.message)).finally(() => setQuoting(false))
    }, 400)
    return () => clearTimeout(t)
  }, [usdcAmount, market.vaultAddress, stock.address])

  const impactBad = q ? q.swapPriceImpact < MAX_PRICE_IMPACT : false
  const noBuyers = q ? !q.ytExecutable : false
  const blocked = impactBad || noBuyers

  async function run() {
    if (!owner || !q) return
    setRunning(true); setError(null); reset()
    let i = 0
    try {
      update(i, { status: "building" })
      const swap = await api<{ transaction: string; requestId: string; expectedOut: string }>("/api/yield-now/build", { step: "swap", owner, usdcAmount: usdcAmount.toString(), baseMint: market.baseMint })
      update(i, { status: "signing" })
      const signedSwap = await signOnly(swap.transaction)
      update(i, { status: "confirming" })
      const swapRes = await api<{ status: string; signature?: string; error?: string }>("/api/yield-now/build", { step: "swap-execute", signedTransaction: signedSwap, requestId: swap.requestId })
      if (swapRes.status !== "Success" || !swapRes.signature) throw new Error(swapRes.error ?? "Swap failed")
      await waitForConfirmation(swapRes.signature as never)
      update(i, { status: "done", signature: swapRes.signature })

      i = 1
      const amountBase = (BigInt(swap.expectedOut) * 995n) / 1000n
      update(i, { status: "building" })
      const strip = await api<{ transaction: string }>("/api/yield-now/build", { step: "strip", owner, vaultAddress: market.vaultAddress, amountBase: amountBase.toString() })
      update(i, { status: "signing" })
      const stripSig = await signAndSend(strip.transaction)
      update(i, { status: "confirming", signature: stripSig })
      await waitForConfirmation(stripSig)
      update(i, { status: "done" })

      i = 2
      const minBaseOut = (BigInt(q.ytProceedsBase) * amountBase / BigInt(q.ytOut)) * 95n / 100n
      update(i, { status: "building" })
      const sell = await api<{ transaction: string }>("/api/yield-now/build", { step: "sell-yt", owner, vaultAddress: market.vaultAddress, orderbook: market.orderbook, ytAmount: amountBase.toString(), minBaseOut: minBaseOut.toString(), maxPriceApy: market.impliedApy * 1.5 })
      update(i, { status: "signing" })
      const sellSig = await signAndSend(sell.transaction)
      update(i, { status: "confirming", signature: sellSig })
      await waitForConfirmation(sellSig)
      update(i, { status: "done" })

      i = 3
      update(i, { status: "building" })
      const buy = await api<{ transaction: string; quoteId: string; routeName: string; providerRequestId?: string; toAmount: string }>("/api/yield-now/build", { step: "buy-stock", owner, fromMint: market.baseMint, amount: minBaseOut.toString(), stockMint: stock.address })
      update(i, { status: "signing" })
      const signedBuy = await signOnly(buy.transaction)
      update(i, { status: "confirming" })
      const exec = await api<{ signature?: string; txHash?: string }>("/api/yield-now/build", { step: "buy-stock-execute", signedTransaction: signedBuy, quoteId: buy.quoteId, routeName: buy.routeName, providerRequestId: buy.providerRequestId })
      update(i, { status: "done", signature: exec.signature ?? exec.txHash, output: `${fmt(buy.toAmount, stock.decimals, 4)} ${stock.symbol}` })
    } catch (e) {
      update(i, { status: "error", error: (e as Error).message }); setError((e as Error).message)
    } finally { setRunning(false) }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.35fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Yield now</CardTitle>
          <CardDescription>Sell the interest today. Keep the principal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
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

          <Hero
            label={`${stock.symbol} in your wallet today`}
            value={q ? `${fmt(q.stockOut, stock.decimals, 4)} ${stock.symbol}` : quoting ? "…" : "—"}
            sub={q?.stockOutUsd != null ? `≈ ${usd(q.stockOutUsd)} · from ${fmt(q.ytProceedsBase, q.decimals, 4)} ${base} of yield` : undefined}
          />
          <Tiles items={[
            { k: "Deposit", v: `${fmt(usdcAmount, 6)} USDC` },
            { k: "Yield sold", v: q ? `${fmt(q.ytProceedsBase, q.decimals, 4)} ${base}` : "—", sub: q ? `${pct(Number(q.ytProceedsBase) / Number(q.ytOut), 2)} of principal` : undefined },
            { k: "Principal back", v: q ? `${fmt(q.baseIn, q.decimals)} ${base}` : "—", sub: date(market.maturity) },
            { k: "Implied APY", v: pct(market.impliedApy, 2), sub: q ? `${q.ytBidCount} YT bids` : undefined },
          ]} />

          {impactBad ? (
            <Alert variant="destructive">
              <WarningIcon />
              <AlertTitle>Swap price impact {pct(q!.swapPriceImpact, 1)}</AlertTitle>
              <AlertDescription>Jupiter has almost no {base} liquidity for this size. Pick a different market or a smaller amount.</AlertDescription>
            </Alert>
          ) : null}
          {noBuyers ? (
            <Alert variant="destructive">
              <WarningIcon />
              <AlertTitle>No one is buying {base} yield right now</AlertTitle>
              <AlertDescription>The Exponent orderbook has no YT bids that can absorb this sale. Pick a market with bids.</AlertDescription>
            </Alert>
          ) : null}
          {error && !running ? <p className="text-destructive text-sm">{error}</p> : null}

          <Button size="lg" onClick={run} disabled={!owner || !q || quoting || running || blocked || usdcAmount <= 0n} className="w-full">
            {!owner ? "Connect a wallet to start" : running ? "Running…" : quoting ? "Quoting…" : blocked ? "Not tradable at this size" : `Buy ${stock.symbol} with yield · 4 signatures`}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">What happens</CardTitle>
          <CardDescription>Four transactions, each signed in your wallet.</CardDescription>
        </CardHeader>
        <CardContent><StepList defs={defs} state={state} /></CardContent>
      </Card>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Flow B — yield DCA
// ----------------------------------------------------------------------------

function YieldDca({ owner, pool, pools, onPool, stock, usdcAmount }: {
  owner?: string; pool: Pool; pools: Pool[]; onPool: (id: string) => void; stock: Stock; usdcAmount: bigint
}) {
  const [principal, setPrincipal] = React.useState(0n)
  const [pos, setPos] = React.useState<{ balance: string; harvestable: string } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<"deposit" | "harvest" | null>(null)
  const { state, update, reset } = useStepState(3)
  const src = SOURCE_LABEL[pool.source]
  const perMonth = (Number(usdcAmount) / 1e6) * pool.apy / 12

  const defs: StepDef[] = [
    { title: "Park the principal", what: `USDC goes into ${pool.name} and earns ${pct(pool.apy, 2)}. It never leaves unless you withdraw it.`, via: src,
      input: `${fmt(usdcAmount, 6)} USDC`, output: `position in ${src}` },
    { title: "Harvest the interest", what: "Only the yield above the principal is withdrawn.", via: src,
      input: pos ? `${fmt(pos.harvestable, 6, 4)} USDC accrued` : "…", output: "USDC in wallet" },
    { title: `Buy ${stock.symbol}`, what: `Harvested USDC buys ${stock.name}. Repeat whenever yield has accrued.`, via: "Sunrise",
      input: pos ? `${fmt(pos.harvestable, 6, 4)} USDC` : "…", output: stock.symbol },
  ]

  const refresh = React.useCallback(async () => {
    if (!owner) return
    try { setPos(await api("/api/yield-dca/position", { owner, pool, principal: principal.toString() })) } catch (e) { setError((e as Error).message) }
  }, [owner, pool, principal])
  React.useEffect(() => { void refresh() }, [refresh])

  async function deposit() {
    if (!owner) return
    setBusy("deposit"); setError(null); reset()
    try {
      update(0, { status: "building" })
      const { transaction } = await api<{ transaction: string }>("/api/yield-dca/build", { step: "deposit", owner, pool, usdcAmount: usdcAmount.toString() })
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
      update(1, { status: "building" })
      const h = await api<{ transaction: string }>("/api/yield-dca/build", { step: "harvest", owner, pool, amountUsdc: amt.toString() })
      update(1, { status: "signing" })
      const sig = await signAndSend(h.transaction)
      update(1, { status: "confirming", signature: sig })
      await waitForConfirmation(sig)
      update(1, { status: "done" })
      i = 2
      update(2, { status: "building" })
      const buy = await api<{ transaction: string; quoteId: string; routeName: string; providerRequestId?: string; toAmount: string }>("/api/yield-dca/build", { step: "buy-stock", owner, amountUsdc: amt.toString(), stockMint: stock.address })
      update(2, { status: "signing", output: `${fmt(buy.toAmount, stock.decimals, 4)} ${stock.symbol}` })
      const signed = await signOnly(buy.transaction)
      update(2, { status: "confirming" })
      const exec = await api<{ signature?: string; txHash?: string }>("/api/yield-now/build", { step: "buy-stock-execute", signedTransaction: signed, quoteId: buy.quoteId, routeName: buy.routeName, providerRequestId: buy.providerRequestId })
      update(2, { status: "done", signature: exec.signature ?? exec.txHash })
      await refresh()
    } catch (e) { update(i, { status: "error", error: (e as Error).message }); setError((e as Error).message) } finally { setBusy(null) }
  }

  const grouped = (["juplend", "kamino", "loopscale"] as const).map((s) => ({ s, items: pools.filter((p) => p.source === s) })).filter((g) => g.items.length)

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.35fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Yield DCA</CardTitle>
          <CardDescription>Deposit once. Every harvest turns interest into shares.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label>Yield pool <span className="text-muted-foreground font-normal">(USDC)</span></Label>
            <Select value={pool.id} onValueChange={(v) => v && onPool(String(v))}>
              <SelectTrigger className="w-full max-w-full overflow-hidden">
                <SelectValue>
                  {(v: string | null) => { const p = pools.find((x) => x.id === v); return p ? <><span className="font-mono">{p.name}</span><span className="text-muted-foreground">{pct(p.apy, 2)}</span></> : null }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {grouped.map((g) => (
                  <SelectGroup key={g.s}>
                    <SelectLabel>{SOURCE_LABEL[g.s]}</SelectLabel>
                    {g.items.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono">{p.name.replace(/^[^·]*· /, "")}</span>
                        <span className="text-muted-foreground">{pct(p.apy, 2)}{p.tvlUsd ? ` · ${usd(p.tvlUsd).replace(/\.\d+$/, "")} TVL` : ""}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Hero
            label="Harvestable now"
            value={pos ? `${fmt(pos.harvestable, 6, 4)} USDC` : owner ? "…" : "—"}
            sub={pos ? `${fmt(pos.balance, 6)} USDC in ${pool.name}` : `connect a wallet to read your ${src} position`}
          />
          <Tiles items={[
            { k: "Deposit", v: `${fmt(usdcAmount, 6)} USDC` },
            { k: "Pool APY", v: pct(pool.apy, 2), sub: pool.tvlUsd ? `${usd(pool.tvlUsd).replace(/\.\d+$/, "")} TVL` : undefined },
            { k: "Yield / month", v: `≈ ${usd(perMonth)}`, sub: `≈ ${usd(perMonth * 12)} / year` },
            { k: "Buys", v: stock.symbol, sub: stock.name },
          ]} />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="grid gap-2">
            <Button size="lg" onClick={deposit} disabled={!owner || busy !== null || usdcAmount <= 0n}>
              {!owner ? "Connect a wallet to start" : busy === "deposit" ? "Depositing…" : `Deposit ${fmt(usdcAmount, 6)} USDC · 1 signature`}
            </Button>
            <Button size="lg" variant="outline" onClick={harvest} disabled={!owner || busy !== null || !pos || BigInt(pos.harvestable) <= 0n}>
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
        <CardContent><StepList defs={defs} state={state} /></CardContent>
      </Card>
    </div>
  )
}
