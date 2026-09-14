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

// ---------------------------------------------------------------------------
// Yield sources behind Exponent's live markets (2026-09-14). None ship a public
// TypeScript SDK; integrate via Jupiter swap into the base token, then Exponent.
// ---------------------------------------------------------------------------

/** https://docs.hylo.so/security/onchain-addresses — Rust SDK only (crates hylo-clients, hylo-idl). IDLs vendored in ./idl */
export const HYLO = {
  exchange: "HYEXCHtHkBagdStcJCp3xbbb9B7sdMdWXFNj6mdsG4hn",
  earnPool: "HysTabVUfmQBFcmzu1ctRd1Y1fxd66RBpboy1bmtDSQQ",
  router: "hyRouTRDAgn65xyyJ3L5c4k5SFmSdr3NxDV8Euzjy3f",
  hyUSD: "5YMkXAYccHSGnHn9nob9xEvv6Pvka9DZWH7nTbotTu9E",
  eHYUSD: "HnnGv3HrSqjRpgdFmx7vQGjntNEoex1SU4e9Lxcxuihz",
  xSOL: "4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs",
  hyloSOL: "hy1oXYgrBW6PVcJ4s6s2FKavRdwgWTXdfE69AxT7kPT",
  hyloSOLPlus: "hy1opf2bqRDwAxoktyWAj6f3UpeHcLydzEdKjMYGs2u",
  /** Undocumented but public JSON: TVL, NAVs, eHYUSD NAV */
  statsUrl: "https://api.hylo.so/stats",
} as const

/** https://docs.onre.finance — no SDK, Anchor IDL vendored in ./idl/onre.json. Permissionless mint via take_offer_permissionless_v2 */
export const ONRE = {
  program: "onreuGhHHgVzMWSkj2oQDLDtvvGvoepBPkqyaubFcwe",
  ONyc: "5Y8NV33Vv7WbnLfq3zBcKSdYPrk7g2KoiQoe7M2tcxp5",
  /** Exponent senior tranche of ONyc (not OnRe-issued) */
  srONyc: "9J8VvigcjFTkN3jhZH2ieTi2hdGVBVpEXbcA1JDo7QpA",
  marketStats: "BuPMet2URHuTVKSHpj32AjsXxHgdsqeA1i82dr1b4Mi5",
  USDG: "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH",
  apiBase: "https://core.api.onre.finance",
} as const

/** https://docs.solstice.finance — SDK is private npm (@solsticelabs/usx-client-sdk). Mint is KYC-gated; USX→eUSX lock is permissionless */
export const SOLSTICE = {
  usxProgram: "USXyiSTsPEWz55pSK7sZoUL79ntoVGQbaTDT57tH6bx",
  yieldVaultProgram: "eUSXyKoZ6aGejYVbnp3wtWQ1E8zuokLAJPecPxxtgG3",
  USX: "6FrrzDk5mQARGc1TDYoyVnSyRdds1t4PbtohCD6p3tgG",
  eUSX: "3ThdFZQKM6kRyVGLG48kaPg5TRMhYMKY1iCRa9xop1WC",
  SLX: "SLXdx4BUt2v9uJQNzWqSfzTJ9UKLUDsvxHFMEEdrfgq",
  apiBase: "https://api.solstice.finance",
} as const

/** https://docs.apyx.fi — apxUSD is centrally minted (CCIP-bridged), no Solana program. Buy on DEX only. */
export const APYX = {
  apxUSD: "HAYQtfJEQ9DbDbaHEhxfGsWbSZ3ywthdsVB3PuB72DYe",
  apyUSD: "Ex8hKasfFCfj3yGuN5TyYRUjHePgVs3uYUJRT8geT7rv",
} as const

/** Strategy Inc. "Stretch" preferred (STRC) xStock — yield accrues via Token-2022 ScaledUiAmount multiplier */
export const STRCx = "Xs78JED6PFZxWc2wCEPspZW9kL3Se5J7L5TChKgsidH"
