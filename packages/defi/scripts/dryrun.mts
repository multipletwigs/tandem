import { Connection, PublicKey } from "@solana/web3.js"
import { quoteYieldNow, buildStripTx, buildSellYtTx, projectYieldDca, BACKPACK_SECURITIES, fetchExponentMarkets } from "../src/index"

const HYUSD_VAULT = "DCeWUSsQ89tE6i6oVtampERVBHbSEivuKzf6ANqtFtmw"
const owner = new PublicKey("11111111111111111111111111111112") // dummy, never signs
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed")

const q = await quoteYieldNow({ usdcAmount: 10_000_000n, vaultAddress: HYUSD_VAULT, stockMint: BACKPACK_SECURITIES.MSTR })
console.log("QUOTE 10 USDC → hyUSD market → MSTR")
console.log("  hyUSD in:        ", Number(q.baseIn) / 1e6)
console.log("  YT price:        ", q.market.ytPriceInAsset.toFixed(4), " implied APY:", (q.impliedApy * 100).toFixed(2) + "%")
console.log("  YT proceeds:     ", Number(q.ytProceedsBase) / 1e6, "hyUSD")
console.log("  MSTR out:        ", Number(q.stockOut) / 1e6, "shares  (~$" + q.stockOutUsd?.toFixed(2) + ")")
console.log("  PT redeems:      ", Number(q.ptOut) / 1e6, "hyUSD on", q.maturity.toISOString().slice(0, 10))

const m = q.market
const { transaction: stripTx, vault } = await buildStripTx({ connection, owner, vaultAddress: HYUSD_VAULT, amountBase: q.baseIn })
console.log("\nSTRIP tx ixs:", stripTx.instructions.length, "programs:", [...new Set(stripTx.instructions.map(i => i.programId.toBase58().slice(0, 8)))].join(","))
const { transaction: sellTx } = await buildSellYtTx({ connection, owner, orderbookAddress: m.orderbookAddresses[0], vault, ytAmount: q.ytOut, maxPriceApy: m.impliedApy * 1.5, minBaseOut: q.ytProceedsBase * 95n / 100n })
console.log("SELL YT tx ixs:", sellTx.instructions.length, "programs:", [...new Set(sellTx.instructions.map(i => i.programId.toBase58().slice(0, 8)))].join(","))

console.log("\nDCA projection: $1000 in JupLend @ 3.8%, monthly, MSTR @ $130")
for (const r of projectYieldDca({ principalUsd: 1000, apy: 0.038, intervalDays: 30, periods: 3, stockPriceUsd: 130 })) console.log(`  m${r.period} yield $${r.yieldUsd.toFixed(2)} → ${r.sharesBought.toFixed(4)} sh (cum ${r.cumulativeShares.toFixed(4)})`)
