import createClient from "openapi-fetch"
import type { paths } from "./generated/loopscale"
import { LOOPSCALE } from "./addresses"

/** Typed client for the Loopscale Markets API (public, REST only, no SDK exists). */
export const loopscale = createClient<paths>({ baseUrl: LOOPSCALE.apiBase })
export type LoopscalePaths = paths
