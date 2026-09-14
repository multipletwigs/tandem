import { JUPITER } from "./addresses"

/** https://developers.jup.ag/docs/swap/order-and-execute */
export interface JupiterOrderParams {
  inputMint: string
  outputMint: string
  /** base units */
  amount: string | number | bigint
  /** wallet that signs; omit for a quote-only response (transaction === null) */
  taker?: string
  slippageBps?: number
  receiver?: string
}

export interface JupiterOrderResponse {
  requestId: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  priceImpact: string
  router: string
  /** base64 transaction, null when no taker was supplied */
  transaction: string | null
  gasless: boolean
  errorCode?: number
  errorMessage?: string
}

export interface JupiterExecuteResponse {
  status: "Success" | "Failed"
  signature?: string
  code?: number
  error?: string
}

export function createJupiterSwap(apiKey?: string) {
  const headers: Record<string, string> = apiKey ? { "x-api-key": apiKey } : {}
  return {
    async order(params: JupiterOrderParams): Promise<JupiterOrderResponse> {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v))
      const res = await fetch(`${JUPITER.swapV2}/order?${qs}`, { headers })
      if (!res.ok) throw new Error(`Jupiter /order ${res.status}`)
      return (await res.json()) as JupiterOrderResponse
    },
    async execute(signedTransaction: string, requestId: string): Promise<JupiterExecuteResponse> {
      const res = await fetch(`${JUPITER.swapV2}/execute`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ signedTransaction, requestId }),
      })
      if (!res.ok) throw new Error(`Jupiter /execute ${res.status}`)
      return (await res.json()) as JupiterExecuteResponse
    },
  }
}
