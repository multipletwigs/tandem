/**
 * Flow B — "Yield DCA into stocks"
 *
 *   USDC ─JupLend deposit─▶ jlUSDC (principal parked, earning)
 *   every interval: withdraw (balance − principal) ─Sunrise─▶ Backpack stock
 *
 * Principal never leaves the lending position; only accrued interest is spent.
 */
import BN from "bn.js"
import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { getDepositIxs, getWithdrawIxs, getUserLendingPositionByAsset } from "@jup-ag/lend/earn"

import { USDC_MINT } from "../addresses"
import { buildBuyStockTx } from "./yield-now"

const USDC = new PublicKey(USDC_MINT)

/** Step 1 — park principal in JupLend (jlUSDC). */
export async function buildDcaDepositTx(params: { connection: Connection; owner: PublicKey; usdcAmount: bigint }) {
  const { ixs } = await getDepositIxs({
    connection: params.connection,
    signer: params.owner,
    asset: USDC,
    amount: new BN(params.usdcAmount.toString()),
  })
  const tx = new Transaction().add(...ixs)
  await finalize(tx, params.connection, params.owner)
  return { transaction: tx }
}

/** Read — how much interest has accrued above the recorded principal? */
export async function getHarvestableYield(params: {
  connection: Connection
  owner: PublicKey
  principalUsdc: bigint
}): Promise<{ balance: bigint; harvestable: bigint }> {
  const pos = await getUserLendingPositionByAsset({
    connection: params.connection,
    user: params.owner,
    asset: USDC,
    market: "main",
  })
  const balance = BigInt(pos.underlyingBalance.toString())
  const harvestable = balance > params.principalUsdc ? balance - params.principalUsdc : 0n
  return { balance, harvestable }
}

/** Step 2 (each interval) — withdraw only the interest. */
export async function buildHarvestTx(params: { connection: Connection; owner: PublicKey; amountUsdc: bigint }) {
  const { ixs } = await getWithdrawIxs({
    connection: params.connection,
    signer: params.owner,
    asset: USDC,
    amount: new BN(params.amountUsdc.toString()),
  })
  const tx = new Transaction().add(...ixs)
  await finalize(tx, params.connection, params.owner)
  return { transaction: tx }
}

/** Step 3 (each interval) — harvested USDC → stock via Sunrise. */
export function buildDcaBuyStockTx(params: { owner: PublicKey; amountUsdc: bigint; stockMint: string }) {
  return buildBuyStockTx({ owner: params.owner, fromMint: USDC_MINT, amount: params.amountUsdc, stockMint: params.stockMint })
}

/** Pure projection for the UI: how much stock does yield alone buy over time? */
export function projectYieldDca(params: {
  principalUsd: number
  apy: number
  intervalDays: number
  periods: number
  stockPriceUsd: number
}) {
  const perPeriodRate = Math.pow(1 + params.apy, params.intervalDays / 365) - 1
  const rows: { period: number; date: Date; yieldUsd: number; sharesBought: number; cumulativeShares: number }[] = []
  let cumulative = 0
  for (let i = 1; i <= params.periods; i++) {
    const yieldUsd = params.principalUsd * perPeriodRate
    const shares = yieldUsd / params.stockPriceUsd
    cumulative += shares
    rows.push({
      period: i,
      date: new Date(Date.now() + i * params.intervalDays * 86_400_000),
      yieldUsd,
      sharesBought: shares,
      cumulativeShares: cumulative,
    })
  }
  return rows
}

async function finalize(tx: Transaction, connection: Connection, feePayer: PublicKey) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.feePayer = feePayer
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight
}
