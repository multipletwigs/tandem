import createClient from "openapi-fetch"
import type { paths } from "./generated/sunrise"
import { SUNRISE } from "./addresses"

/** Typed client for the Sunrise public API (no auth). */
export const sunrise = createClient<paths>({ baseUrl: SUNRISE.apiBase })
export type SunrisePaths = paths
