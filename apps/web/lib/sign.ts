"use client"

import {
  getBase58Decoder,
  getBase64Decoder,
  getBase64Encoder,
  getTransactionDecoder,
  getTransactionEncoder,
  isTransactionModifyingSigner,
  isTransactionPartialSigner,
  isTransactionSendingSigner,
  type Signature,
  type Transaction,
  type TransactionWithinSizeLimit,
  type TransactionWithLifetime,
} from "@solana/kit"

import { client } from "@/app/providers"

/** Kit signers want the size-limit + lifetime brands; wire bytes from Jupiter/Sunrise/Exponent already satisfy both. */
type SignableTx = Transaction & TransactionWithinSizeLimit & TransactionWithLifetime

function decodeTx(b64: string): SignableTx {
  return getTransactionDecoder().decode(getBase64Encoder().encode(b64)) as SignableTx
}
const encodeTx = (tx: Transaction) => getBase64Decoder().decode(getTransactionEncoder().encode(tx))

function requireSigner() {
  const { connected } = client.wallet.getState()
  if (!connected?.signer) throw new Error("Connect a wallet first")
  return connected.signer
}

/** Wallet signs only. Caller forwards the result to a provider's /execute (Jupiter, Sunrise). Returns base64. */
export async function signOnly(b64: string): Promise<string> {
  const signer = requireSigner()
  const tx = decodeTx(b64)
  if (isTransactionModifyingSigner(signer)) {
    const [signed] = await signer.modifyAndSignTransactions([tx])
    return encodeTx(signed!)
  }
  if (isTransactionPartialSigner(signer)) {
    const [sigs] = await signer.signTransactions([tx])
    return encodeTx({ ...tx, signatures: { ...tx.signatures, ...sigs } } as SignableTx)
  }
  throw new Error("Wallet cannot sign without sending; use signAndSend")
}

/** Wallet signs and the transaction is broadcast. Use for Exponent / JupLend transactions. */
export async function signAndSend(b64: string): Promise<Signature> {
  const signer = requireSigner()
  if (isTransactionSendingSigner(signer)) {
    const [sig] = await signer.signAndSendTransactions([decodeTx(b64)])
    return getBase58Decoder().decode(sig!) as Signature
  }
  const signed = await signOnly(b64)
  return client.rpc.sendTransaction(signed as never, { encoding: "base64", preflightCommitment: "confirmed" }).send()
}

/** Poll until the signature is confirmed or the deadline passes. */
export async function waitForConfirmation(sig: Signature, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { value } = await client.rpc.getSignatureStatuses([sig]).send()
    const st = value[0]
    if (st?.err) throw new Error(`Transaction failed: ${JSON.stringify(st.err)}`)
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error("Confirmation timed out")
}
