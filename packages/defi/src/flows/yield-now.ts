/**
 * Flow A — "Yield now into stocks"
 *
 *   USDC ─Jupiter─▶ base (hyUSD) ─Exponent strip─▶ PT + YT
 *   YT ─Exponent orderbook─▶ base ─Sunrise─▶ Backpack stock
 *   PT ─(maturity)─▶ base ─Jupiter─▶ USDC
 *
 * Every builder returns an UNSIGNED transaction for the user's wallet to sign.
 * Steps are sequential because each input depends on the previous fill.
 */
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"
import { LOCAL_ENV, Orderbook, Vault, YtPosition, OfferType } from "@exponent-labs/exponent-sdk"

import { USDC_MINT } from "../addresses"
import { fetchExponentMarkets, type ExponentMarket } from "../exponent-api"
import { createJupiterSwap } from "../jupiter"
import { quoteSunrise, type SunriseQuote } from "../sunrise"

/** Exponent mainnet program IDs live in LOCAL_ENV despite the name. */
export const EXPONENT_MAINNET_ENV = LOCAL_ENV

export interface YieldNowQuote {
  market: ExponentMarket
  usdcIn: bigint
  /** base token received from Jupiter */
  baseIn: bigint
  /** PT + YT minted (1:1 with base, scaled by SY rate) */
  ptOut: bigint
  ytOut: bigint
  /** base token expected from selling all YT at the current implied price */
  ytProceedsBase: bigint
  /** stock units expected from Sunrise for ytProceedsBase */
  stockOut: bigint
  stockOutUsd?: number
  stockMint: string
  maturity: Date
  impliedApy: number
}

/** Pure read: what does $X of USDC turn into, today, on a given market? */
export async function quoteYieldNow(params: {
  usdcAmount: bigint
  vaultAddress: string
  stockMint: string
  jupiterApiKey?: string
}): Promise<YieldNowQuote> {
  const markets = await fetchExponentMarkets()
  const market = markets.find((m) => m.vaultAddress === params.vaultAddress)
  if (!market) throw new Error(`Exponent market ${params.vaultAddress} not found`)
  const baseMint = market.underlyingAsset.mint

  const jup = createJupiterSwap(params.jupiterApiKey)
  const swap = await jup.order({ inputMint: USDC_MINT, outputMint: baseMint, amount: params.usdcAmount })
  const baseIn = BigInt(swap.outAmount)

  // Strip is 1 base → 1 PT + 1 YT (SY-normalised; ptRedemptionRate ≈ 1 near issuance)
  const ptOut = baseIn
  const ytOut = baseIn
  const ytProceedsBase = BigInt(Math.floor(Number(ytOut) * market.ytPriceInAsset))

  const [stock] = await quoteSunrise({ fromToken: baseMint, toToken: params.stockMint, fromAmount: ytProceedsBase })

  return {
    market,
    usdcIn: params.usdcAmount,
    baseIn,
    ptOut,
    ytOut,
    ytProceedsBase,
    stockOut: BigInt(stock?.toAmount ?? 0),
    stockOutUsd: stock?.toAmountUSD,
    stockMint: params.stockMint,
    maturity: new Date(market.maturityDateUnixTs * 1000),
    impliedApy: market.impliedApy,
  }
}

/** Step 1 — USDC → base via Jupiter Swap V2. Returns base64 VersionedTransaction. */
export async function buildSwapUsdcToBaseTx(params: {
  owner: PublicKey
  usdcAmount: bigint
  baseMint: string
  slippageBps?: number
  jupiterApiKey?: string
}) {
  const jup = createJupiterSwap(params.jupiterApiKey)
  const order = await jup.order({
    inputMint: USDC_MINT,
    outputMint: params.baseMint,
    amount: params.usdcAmount,
    taker: params.owner.toBase58(),
    slippageBps: params.slippageBps ?? 50,
  })
  if (!order.transaction) throw new Error(order.errorMessage ?? "Jupiter returned no transaction")
  return { transaction: order.transaction, requestId: order.requestId, expectedOut: BigInt(order.outAmount) }
}

/** Step 2 — base → PT + YT on Exponent. Initialises the yield position on first use. */
export async function buildStripTx(params: {
  connection: Connection
  owner: PublicKey
  vaultAddress: string
  amountBase: bigint
}): Promise<{ transaction: Transaction; vault: Vault }> {
  const vault = await Vault.load(EXPONENT_MAINNET_ENV, params.connection, new PublicKey(params.vaultAddress))
  const tx = new Transaction()
  const hasPosition = await YtPosition.loadByOwner(EXPONENT_MAINNET_ENV, params.connection, params.owner, vault)
    .then(() => true)
    .catch(() => false)
  if (!hasPosition) tx.add(vault.ixInitializeYieldPosition({ owner: params.owner }))
  tx.add(await vault.ixStripFromBase({ owner: params.owner, amountBase: params.amountBase }))
  await finalize(tx, params.connection, params.owner)
  return { transaction: tx, vault }
}

/** Step 3 — sell all YT on the Exponent orderbook for base. */
export async function buildSellYtTx(params: {
  connection: Connection
  owner: PublicKey
  orderbookAddress: string
  vault: Vault
  ytAmount: bigint
  /** worst acceptable price expressed as implied APY (higher APY = cheaper YT for the buyer = worse for us) */
  maxPriceApy: number
  minBaseOut: bigint
}): Promise<{ transaction: Transaction }> {
  const ob = await Orderbook.load(
    EXPONENT_MAINNET_ENV,
    params.connection,
    new PublicKey(params.orderbookAddress),
    undefined,
    params.vault,
  )
  const { ix, setupIxs } = await ob.ixWrapperMarketOffer({
    trader: params.owner,
    maxPriceApy: params.maxPriceApy,
    amount: params.ytAmount,
    offerType: OfferType.SellYt,
    minAmountOut: params.minBaseOut,
    virtualOffer: false,
    mintSy: params.vault.mintSy,
  })
  const tx = new Transaction().add(...setupIxs, ix)
  await finalize(tx, params.connection, params.owner)
  return { transaction: tx }
}

/** Step 4 — base → Backpack stock via Sunrise. Returns the quote with an unsigned tx. */
export async function buildBuyStockTx(params: {
  owner: PublicKey
  fromMint: string
  amount: bigint
  stockMint: string
}): Promise<SunriseQuote> {
  const [quote] = await quoteSunrise({
    fromToken: params.fromMint,
    toToken: params.stockMint,
    fromAmount: params.amount,
    fromAddress: params.owner.toBase58(),
    toAddress: params.owner.toBase58(),
  })
  if (!quote?.unsignedTransaction) throw new Error("Sunrise returned no transaction")
  return quote
}

/** Step 5 (after maturity) — PT → base. Exponent redeems PT via merge-to-base at the frozen rate. */
export async function buildRedeemPtTx(params: {
  connection: Connection
  owner: PublicKey
  vaultAddress: string
  amountPt: bigint
}): Promise<{ transaction: Transaction }> {
  const vault = await Vault.load(EXPONENT_MAINNET_ENV, params.connection, new PublicKey(params.vaultAddress))
  if (Date.now() < vault.expirationTimestamp * 1000) throw new Error(`Vault matures ${vault.expirationDate.toISOString()}`)
  const { ixs, setupIxs } = await vault.ixMergeToBase({ owner: params.owner, amountPy: params.amountPt })
  const tx = new Transaction().add(...setupIxs, ...ixs)
  await finalize(tx, params.connection, params.owner)
  return { transaction: tx }
}

export function deserializeBase64Tx(b64: string): VersionedTransaction {
  return VersionedTransaction.deserialize(new Uint8Array(Buffer.from(b64, "base64")))
}

async function finalize(tx: Transaction, connection: Connection, feePayer: PublicKey) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.feePayer = feePayer
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight
}
