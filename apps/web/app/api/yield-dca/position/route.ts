import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { getPoolBalance, type DcaPool } from "@workspace/defi"

import { serverConnection } from "@/lib/server-rpc"

export async function POST(req: NextRequest) {
  const { owner, pool, principal } = (await req.json()) as { owner: string; pool: DcaPool; principal: string }
  try {
    const balance = await getPoolBalance({ pool, owner: new PublicKey(owner), connection: serverConnection() })
    const p = BigInt(principal ?? "0")
    return NextResponse.json({ balance: balance.toString(), harvestable: (balance > p ? balance - p : 0n).toString() })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
