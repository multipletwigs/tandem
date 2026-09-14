import { WalletButton } from "@/components/wallet-button"
import { YieldPanel } from "@/components/yield-panel"

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-8 px-4 py-6 md:px-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Tandem</h1>
          <p className="text-muted-foreground text-sm">Next year&apos;s interest buys stock today. The principal comes back whole.</p>
        </div>
        <WalletButton />
      </header>
      <YieldPanel />
      <footer className="text-muted-foreground mt-auto text-xs">
        Exponent · Jupiter · Sunrise · JupLend · Backpack Securities. Mainnet. Nothing here is financial advice.
      </footer>
    </main>
  )
}
