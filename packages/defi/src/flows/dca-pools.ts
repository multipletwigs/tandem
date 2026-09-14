/**
 * USDC yield pools for Flow B. One deposit → interest accrues → harvest only the interest.
 * JupLend via its SDK; Kamino and Loopscale via their transaction APIs (both return unsigned txs).
 */
import BN from "bn.js"
import { Connection, PublicKey, Transaction, VersionedMessage, VersionedTransaction } from "@solana/web3.js"
import { getDepositIxs, getWithdrawIxs, getUserLendingPositionByAsset } from "@jup-ag/lend/earn"

import { JUPLEND, KAMINO, LOOPSCALE, USDC_MINT } from "../addresses"

export type DcaSource = "juplend" | "kamino" | "loopscale"

export interface DcaPool {
  id: string
  source: DcaSource
  /** human label, e.g. "Kamino · Main Market" */
  name: string
  /** annual, as a fraction */
  apy: number
  tvlUsd?: number
  /** source-specific routing data */
  meta: { market?: string; reserve?: string; vault?: string; lpMint?: string }
}

const USDC = new PublicKey(USDC_MINT)
const KAMINO_MIN_TVL_USD = 1_000_000

// ---------------------------------------------------------------------------
// discovery
// ---------------------------------------------------------------------------

export async function listUsdcPools(): Promise<DcaPool[]> {
  const [jup, kam, loop] = await Promise.allSettled([listJupLend(), listKamino(), listLoopscale()])
  const all = [jup, kam, loop].flatMap((r) => (r.status === "fulfilled" ? r.value : []))
  return all.sort((a, b) => b.apy - a.apy)
}

async function listJupLend(): Promise<DcaPool[]> {
  const res = await fetch("https://lite-api.jup.ag/lend/v1/earn/tokens")
  if (!res.ok) return []
  const tokens = (await res.json()) as { symbol: string; assetAddress: string; totalRate: number; totalAssets: string; asset?: { price?: string } }[]
  return tokens
    .filter((t) => t.assetAddress === USDC_MINT)
    .map((t) => ({
      id: "juplend:jlUSDC",
      source: "juplend" as const,
      name: "JupLend · jlUSDC",
      apy: t.totalRate / 1e4,
      tvlUsd: Number(t.totalAssets) / 1e6,
      meta: {},
    }))
}

async function listKamino(): Promise<DcaPool[]> {
  const res = await fetch(`${KAMINO.apiBase}/v2/kamino-market`)
  if (!res.ok) return []
  const markets = (await res.json()) as { lendingMarket: string; name: string }[]
  const out = await Promise.all(
    markets.map(async (m) => {
      const r = await fetch(`${KAMINO.apiBase}/kamino-market/${m.lendingMarket}/reserves/metrics`)
      if (!r.ok) return []
      const reserves = (await r.json()) as { reserve: string; liquidityTokenMint: string; supplyApy: string; totalSupplyUsd: string }[]
      return reserves
        .filter((x) => x.liquidityTokenMint === USDC_MINT && Number(x.totalSupplyUsd) >= KAMINO_MIN_TVL_USD)
        .map((x) => ({
          id: `kamino:${x.reserve}`,
          source: "kamino" as const,
          name: `Kamino · ${m.name}`,
          apy: Number(x.supplyApy),
          tvlUsd: Number(x.totalSupplyUsd),
          meta: { market: m.lendingMarket, reserve: x.reserve },
        }))
    }),
  )
  return out.flat()
}

async function listLoopscale(): Promise<DcaPool[]> {
  const res = await fetch(`${LOOPSCALE.apiBase}/lending_vaults/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: 0, pageSize: 50, includeStrategySummaries: true }),
  })
  if (!res.ok) return []
  const body = (await res.json()) as {
    lendVaults: {
      vault: { address: string; principalMint: string; lpMint: string; depositsEnabled?: boolean }
      vaultMetadata?: { name?: string; title?: string; symbol?: string }
      strategySummary?: { wAvgApy?: number; totalSupplyUsd?: number }
    }[]
  }
  return body.lendVaults
    .filter((v) => v.vault.principalMint === USDC_MINT && v.vault.depositsEnabled !== false && (v.strategySummary?.wAvgApy ?? 0) > 0)
    .map((v) => ({
      id: `loopscale:${v.vault.address}`,
      source: "loopscale" as const,
      name: `Loopscale · ${v.vaultMetadata?.name ?? v.vaultMetadata?.title ?? v.vaultMetadata?.symbol ?? v.vault.address.slice(0, 6)}`,
      apy: v.strategySummary?.wAvgApy ?? 0,
      tvlUsd: v.strategySummary?.totalSupplyUsd,
      meta: { vault: v.vault.address, lpMint: v.vault.lpMint },
    }))
}

// ---------------------------------------------------------------------------
// actions — all return base64 unsigned transactions
// ---------------------------------------------------------------------------

export async function buildPoolDepositTx(p: { pool: DcaPool; owner: PublicKey; amountUsdc: bigint; connection: Connection }): Promise<string> {
  switch (p.pool.source) {
    case "juplend": {
      const { ixs } = await getDepositIxs({ connection: p.connection, signer: p.owner, asset: USDC, amount: new BN(p.amountUsdc.toString()) })
      return legacyToBase64(await finalize(new Transaction().add(...ixs), p.connection, p.owner))
    }
    case "kamino":
      return kaminoTx("deposit", p)
    case "loopscale":
      return loopscaleTx("deposit", p)
  }
}

export async function buildPoolWithdrawTx(p: { pool: DcaPool; owner: PublicKey; amountUsdc: bigint; connection: Connection }): Promise<string> {
  switch (p.pool.source) {
    case "juplend": {
      const { ixs } = await getWithdrawIxs({ connection: p.connection, signer: p.owner, asset: USDC, amount: new BN(p.amountUsdc.toString()) })
      return legacyToBase64(await finalize(new Transaction().add(...ixs), p.connection, p.owner))
    }
    case "kamino":
      return kaminoTx("withdraw", p)
    case "loopscale":
      return loopscaleTx("withdraw", p)
  }
}

/** Current USDC value of the position (base units). */
export async function getPoolBalance(p: { pool: DcaPool; owner: PublicKey; connection: Connection }): Promise<bigint> {
  switch (p.pool.source) {
    case "juplend": {
      const pos = await getUserLendingPositionByAsset({ connection: p.connection, user: p.owner, asset: USDC, market: "main" })
      return BigInt(pos.underlyingBalance.toString())
    }
    case "kamino": {
      const res = await fetch(`${KAMINO.apiBase}/kamino-market/${p.pool.meta.market}/users/${p.owner.toBase58()}/obligations`)
      if (!res.ok) throw new Error(`Kamino obligations ${res.status}`)
      const obligations = (await res.json()) as { deposits?: Record<string, unknown>[] }[]
      let total = 0
      for (const o of obligations) {
        for (const d of o.deposits ?? []) {
          const reserve = String(d.reserve ?? d.reserveAddress ?? "")
          const mint = String(d.mint ?? d.mintAddress ?? d.liquidityTokenMint ?? "")
          if (reserve !== p.pool.meta.reserve && mint !== USDC_MINT) continue
          // API returns UI-unit decimals as strings
          total += Number(d.amount ?? d.depositedAmount ?? d.marketValueRefreshed ?? d.marketValue ?? 0)
        }
      }
      return BigInt(Math.floor(total * 1e6))
    }
    case "loopscale": {
      const res = await fetch(`${LOOPSCALE.apiBase}/lending_vaults/user_positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "user-wallet": p.owner.toBase58() },
        body: JSON.stringify({ userAddress: p.owner.toBase58(), vaultAddresses: [p.pool.meta.vault], page: 0, pageSize: 50 }),
      })
      if (!res.ok) throw new Error(`Loopscale positions ${res.status}`)
      const body = (await res.json()) as { positions?: Record<string, unknown>[] }
      let total = 0
      for (const pos of body.positions ?? []) {
        total += Number(pos.principalAmount ?? pos.principalValue ?? pos.currentValue ?? pos.depositedAmount ?? 0)
      }
      return BigInt(Math.floor(total))
    }
  }
}

// ---------------------------------------------------------------------------
// provider transaction APIs
// ---------------------------------------------------------------------------

async function kaminoTx(kind: "deposit" | "withdraw", p: { pool: DcaPool; owner: PublicKey; amountUsdc: bigint }): Promise<string> {
  const res = await fetch(`${KAMINO.apiBase}/ktx/klend/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: p.owner.toBase58(),
      market: p.pool.meta.market,
      reserve: p.pool.meta.reserve,
      amount: (Number(p.amountUsdc) / 1e6).toFixed(6),
    }),
  })
  const body = (await res.json()) as { transaction?: string; message?: string }
  if (!res.ok || !body.transaction) throw new Error(body.message ?? `Kamino ${kind} ${res.status}`)
  return body.transaction
}

async function loopscaleTx(kind: "deposit" | "withdraw", p: { pool: DcaPool; owner: PublicKey; amountUsdc: bigint }): Promise<string> {
  const payload =
    kind === "deposit"
      ? { vault: p.pool.meta.vault, principalAmount: Number(p.amountUsdc), minLpAmount: 0, depositOnly: false }
      : { vault: p.pool.meta.vault, amountPrincipal: Number(p.amountUsdc), maxAmountLp: Number.MAX_SAFE_INTEGER, withdrawAll: false, withdrawOnly: false }
  const res = await fetch(`${LOOPSCALE.apiBase}/lending_vaults/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-wallet": p.owner.toBase58(), "Idempotent-Key": crypto.randomUUID() },
    body: JSON.stringify(payload),
  })
  const body = (await res.json()) as { transaction?: { message: string; signatures?: string[] }; error?: { message?: string } }
  if (!res.ok || !body.transaction) throw new Error(body.error?.message ?? `Loopscale ${kind} ${res.status}`)
  // Loopscale returns a serialized v0 *message*; wrap it into a transaction for the wallet.
  const msg = VersionedMessage.deserialize(new Uint8Array(Buffer.from(body.transaction.message, "base64")))
  return Buffer.from(new VersionedTransaction(msg).serialize()).toString("base64")
}

async function finalize(tx: Transaction, connection: Connection, feePayer: PublicKey) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.feePayer = feePayer
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight
  return tx
}
const legacyToBase64 = (tx: Transaction) => Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString("base64")

export { JUPLEND }
