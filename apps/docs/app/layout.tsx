import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import type { Metadata } from 'next'
import 'nextra-theme-docs/style.css'

export const metadata: Metadata = {
  title: {
    default: 'Tandem Docs',
    template: '%s – Tandem'
  }
}

const navbar = <Navbar logo={<b>Tandem</b>} />
const footer = <Footer>MIT {new Date().getFullYear()} © Tandem.</Footer>

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout navbar={navbar} pageMap={await getPageMap()} footer={footer}>
          {children}
        </Layout>
      </body>
    </html>
  )
}
