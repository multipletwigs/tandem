import { Connection, PublicKey } from "@solana/web3.js"
import { Orderbook, Vault, LOCAL_ENV, OfferType } from "@exponent-labs/exponent-sdk"
const c = new Connection("https://api.mainnet-beta.solana.com", "confirmed")
const vault = await Vault.load(LOCAL_ENV, c, new PublicKey("DCeWUSsQ89tE6i6oVtampERVBHbSEivuKzf6ANqtFtmw"))
const ob = await Orderbook.load(LOCAL_ENV, c, new PublicKey("CYXiuoK84U3VAm9zoXZj6QaLmTsKRsRGTt4auoy7xpB5"), undefined, vault)
const offers: any[] = (ob as any).offers ?? (ob as any).getOffers?.() ?? []
console.log("offers:", offers.length)
for (const o of offers.slice(0, 12)) console.log(`  ${o.type === OfferType.BuyYt ? "BUY YT " : "SELL YT"} apy=${(o.priceApy * 100).toFixed(2)}% amount=${(o.amount / 1e6).toFixed(2)} virtual=${o.isVirtual}`)
console.log("keys:", Object.keys(ob).filter(k => !k.startsWith("_")).join(","))
