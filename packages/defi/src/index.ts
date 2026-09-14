export * from "./addresses"
export * from "./exponent-api"
export * from "./jupiter"
export * from "./onre"
export * from "./hylo"
export { sunrise, type SunrisePaths } from "./sunrise"
export { loopscale, type LoopscalePaths } from "./loopscale"
export { xstocks, createXStocksClient, type XStocksPaths } from "./xstocks"
export { solstice, fetchSolsticeApy, type SolsticePaths } from "./solstice"

// Protocol SDKs (re-exported so apps depend only on @workspace/defi)
export * as exponent from "@exponent-labs/exponent-sdk"
export * as kamino from "@kamino-finance/klend-sdk"
export * as juplendEarn from "@jup-ag/lend/earn"
export * as juplendRead from "@jup-ag/lend-read"

// Product flows
export * from "./flows/yield-now"
export * from "./flows/yield-dca"
export { quoteSunrise, executeSunrise, type SunriseQuote } from "./sunrise"
export * from "./flows/dca-pools"
