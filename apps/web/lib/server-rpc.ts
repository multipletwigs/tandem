import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"

/** Server-only web3.js v1 connection for the protocol SDKs in @workspace/defi. */
export function serverConnection() {
  return new Connection(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed")
}

/** Unsigned legacy or v0 transaction → base64 wire bytes for the wallet to sign. */
export function toBase64(tx: Transaction | VersionedTransaction) {
  const bytes = tx instanceof VersionedTransaction ? tx.serialize() : tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  return Buffer.from(bytes).toString("base64")
}
