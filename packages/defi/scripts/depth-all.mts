import { Connection, PublicKey } from "@solana/web3.js"
import { Orderbook, Vault, LOCAL_ENV, OfferType } from "@exponent-labs/exponent-sdk"
import { fetchExponentMarkets } from "../src/index"
const c = new Connection("https://api.mainnet-beta.solana.com", "confirmed")
const ms = (await fetchExponentMarkets()).filter(m => m.orderbookAddresses.length)
for (const m of ms) {
  await new Promise(r => setTimeout(r, 2500))
  try {
    const vault = await Vault.load(LOCAL_ENV, c, new PublicKey(m.vaultAddress))
    const ob = await Orderbook.load(LOCAL_ENV, c, new PublicKey(m.orderbookAddresses[0]), undefined, vault)
    const offers = ob.getOffers()
    const buys = offers.filter(o => o.type === OfferType.BuyYt), sells = offers.filter(o => o.type === OfferType.SellYt)
    const sum = (a: typeof offers) => a.reduce((s, o) => s + Number(o.amount), 0) / 10 ** m.decimals
    const bestBid = buys.length ? Math.min(...buys.map(o => o.priceApy)) : null
    console.log(`${m.tokenName.padEnd(9)} ${new Date(m.maturityDateUnixTs*1000).toISOString().slice(0,10)} clmm=${m.legacyMarketAddresses.length} | YT bids ${String(buys.length).padStart(2)} (${sum(buys).toFixed(0).padStart(8)}) best ${bestBid !== null ? (bestBid*100).toFixed(1)+"%" : "  -  "} | YT asks ${String(sells.length).padStart(2)} (${sum(sells).toFixed(0).padStart(8)})`)
  } catch (e: any) { console.log(m.tokenName, "ERR", e.message?.slice(0, 80)) }
}
