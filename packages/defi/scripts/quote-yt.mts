import { Connection, PublicKey } from "@solana/web3.js"
import { Orderbook, Vault, LOCAL_ENV, OfferType, QuoteDirection } from "@exponent-labs/exponent-sdk"
const c = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed")
const V = "Dy8bAHHbxkY87aZbSmycazWvui7kpLU6uAPkEkZA3fj5", OB = "4nZqJhZNLu9Hv6vQ7X1bMJLv3nEyAcRZvFcQ2qJ8x7Uz"
const vault = await Vault.load(LOCAL_ENV, c, new PublicKey(V))
const m = (await (await fetch("https://api.exponent.finance/markets")).json()).find((x: any) => x.vaultAddress === V)
const ob = await Orderbook.load(LOCAL_ENV, c, new PublicKey(m.orderbookAddresses[0]), undefined, vault)
const now = Math.floor(Date.now() / 1000), rate = vault.currentSyExchangeRate
for (const yt of [10e6, 1000e6, 20000e6]) {
  try { const q = ob.getQuote({ inAmount: yt, direction: QuoteDirection.YT_TO_BASE, unixNow: now, syExchangeRate: rate }); console.log(`sell ${yt/1e6} YT → ${(q.outAmount/1e6).toFixed(4)} USX  (${(q.outAmount/yt*100).toFixed(3)}% ) fees ${q.takerFees} apyAfter ${q.impliedApyAfterTrade}`) }
  catch (e: any) { console.log(`sell ${yt/1e6} YT → ERR ${e.message?.slice(0,100)}`) }
}
const bids = ob.getOffers().filter(o => o.type === OfferType.BuyYt); console.log("YT bids:", bids.length, "depth", bids.reduce((s,o)=>s+Number(o.amount),0)/1e6, "USX-equivalent? (raw/1e6)")
