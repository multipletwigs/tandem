/**
 * Mainnet addresses discovered on 2026-09-14. Sources are linked per block.
 * Verify before relying on them in production.
 */

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

/** https://docs.exponent.finance/developers/exponent-programs */
export const EXPONENT = {
  core: "ExponentnaRg3CQbW6dqQNZKXp7gtZ9DGMp1cwC4HAS7",
  clmm: "XPC1MM4dYACDfykNuXYZ5una2DsMDWL24CrYubCvarC",
  orderbook: "XPBookgQTN2p8Yw1C2La35XkPMmZTCEYH77AdReVvK1",
  tranching: "XPTrnchoawiUc9iYJrpfchS8vgr8Y5X2QGBdHPXukty",
  strategyVaults: "sVau1tXvayVWfotzm9Ahcv2qfnnfRWttt78BCnNC6dD",
  syGeneric: "XP1BRLn8eCYSygrd8er5P4GKdzqKbC3DLoSsS5UYVZy",
  syKamino: "XPK1ndTK1xrgRg99ifvdPP1exrx8D1mRXTuxBkkroCx",
  syMarginfi: "XPMfipyhcbq3DBvgvxkbZY7GekwmGNJLMD3wdiCkBc7",
  syJitoRestaking: "XPJitopeUEhMZVF72CvswnwrS2U2akQvk5s26aEfWv2",
  /** Undocumented but public: GET /markets, /vaults, /tokens */
  apiBase: "https://api.exponent.finance",
} as const

/** https://kamino.com/docs/build/resources/program-addresses.md */
export const KAMINO = {
  klend: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  kvault: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  mainMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  apiBase: "https://api.kamino.finance",
} as const

/** https://github.com/jup-ag/jupiter-lend/blob/main/docs/earn/sdk.md */
export const JUPLEND = {
  lending: "7tjE28izRUjzmxC1QNXnNwcc4N82CNYCexf3k8mw67s3",
  jlUSDC: "9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D",
  apiBase: "https://api.jup.ag/lend/v1",
} as const

/** https://docs.loopscale.com/resources/addresses.md */
export const LOOPSCALE = {
  core: "1oopBoJG58DgkUVKkEzKgyG9dvRmpgeEm1AVjoHkF78",
  beamOracle: "beamVVkNmKeXcuZ6zLpC9eM5YgVyAn4Z9xdPrz3gCW2",
  apiBase: "https://tars.loopscale.com/v1/markets",
} as const

/** https://docs.sunrise.xyz — asset gateway for Backpack Securities, REST only */
export const SUNRISE = {
  apiBase: "https://api.sunrise.xyz",
} as const

/** https://developers.jup.ag/docs/swap — keyless at 0.5 RPS, x-api-key for more */
export const JUPITER = {
  swapV2: "https://api.jup.ag/swap/v2",
  triggerV2: "https://api.jup.ag/trigger/v2",
  tokensV2: "https://api.jup.ag/tokens/v2",
} as const

/** xStocks by Backed Assets (JE) Ltd. Token-2022. https://xstocks.com */
export const XSTOCKS = {
  NVDAx: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
  TSLAx: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
  AAPLx: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
  SPYx: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
  MSTRx: "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ",
  apiBase: "https://api.xstocks.fi/api/v2/public",
} as const

/** Backpack Securities (Backpack's own 1:1 issuance, distributed via Sunrise). Token-2022. */
export const BACKPACK_SECURITIES = {
  MSTR: "MSTRdWXMeZxdE8osAQy3fA4rvTY5rgummDSMEx6U7Nz",
  SPCX: "SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb",
  /** Full list: GET https://api.sunrise.xyz/v1/tokens, filter issuer === "backpack_securities" */
} as const
