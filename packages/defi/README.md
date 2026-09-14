# @workspace/defi

Protocol SDKs and typed REST clients used by Tandem.

| Protocol  | Integration                                   | Notes                                      |
| --------- | --------------------------------------------- | ------------------------------------------ |
| Exponent  | `@exponent-labs/exponent-sdk` (web3.js v1)    | PT/YT strip, sell YT, buy PT, merge        |
| Kamino    | `@kamino-finance/klend-sdk` (@solana/kit)     | Lend deposit → cToken, kVault → shares     |
| JupLend   | `@jup-ag/lend`, `@jup-ag/lend-read` (web3 v1) | Earn deposit/withdraw, jlToken APY         |
| Loopscale | REST only, types in `src/generated/loopscale` | `https://tars.loopscale.com/v1/markets`    |
| Sunrise   | REST only, types in `src/generated/sunrise`   | Backpack Securities stock list + quotes    |
| Jupiter   | Swap API V2 / Trigger V2 via `fetch`          | `https://api.jup.ag/swap/v2`, `/trigger/v2`|

Regenerate REST types: `pnpm --filter @workspace/defi generate`.

## Yield sources behind Exponent's live markets

None of these ship a public TypeScript SDK. For the "yield now" flow you don't need one:
Jupiter-swap USDC into the market's base token (USX, hyUSD, ONyc, STRCx…) and hand it to
Exponent's `Vault.ixStripFromBase` / `MarketThree.ixWrapperSellYt`.

| Source    | What exists                                                    | In this package                          |
| --------- | -------------------------------------------------------------- | ---------------------------------------- |
| Solstice  | Private npm SDK (KYC mint). Public `/v1/apy`, `/v1/tvl`        | `solstice` client, `fetchSolsticeApy`    |
| Hylo      | Rust crates only. Anchor IDLs public                            | `hylo*Idl`, `fetchHyloStats`             |
| OnRe      | Anchor IDL public, permissionless `take_offer_permissionless_v2` | `onreIdl`, `fetchOnreLiveApy/Nav`      |
| xStocks   | OpenAPI (public price/multiplier, gated issuance)               | `xstocks` client, `STRCx` mint           |
| Apyx      | Nothing on Solana (CCIP-bridged, EVM vault)                     | mints only                               |
