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
