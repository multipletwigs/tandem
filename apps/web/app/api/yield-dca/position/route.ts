import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { getHarvestableYield } from "@workspace/defi"

import { serverConnection } from "@/lib/server-rpc"

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner")
  const principal = req.nextUrl.searchParams.get("principal") ?? "0"
  if (!owner) return NextResponse.json({ error: "owner required" }, { status: 400 })
  try {
    const r = await getHarvestableYield({ connection: serverConnection(), owner: new PublicKey(owner), principalUsdc: BigInt(principal) })
    return NextResponse.json({ balance: r.balance.toString(), harvestable: r.harvestable.toString() })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
