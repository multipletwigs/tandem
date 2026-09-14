import { Inter } from "next/font/google"
import localFont from "next/font/local"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/app/providers"
import { cn } from "@workspace/ui/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const departureMono = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-mono",
  weight: "400",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", "font-sans", inter.variable, departureMono.variable)}
    >
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
