import PocketBase from 'pocketbase'
import { env } from '$env/dynamic/private'

export const POCKETBASE_URL =
  env.INTERNAL_POCKETBASE_URL ||
  process.env.INTERNAL_POCKETBASE_URL ||
  env.POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  env.VITE_POCKETBASE_URL ||
  process.env.VITE_POCKETBASE_URL ||
  'http://127.0.0.1:8095'

export const PROXY_SECRET_HEADER = 'x-mt-proxy-secret'

export function getProxySecret(): string | undefined {
  return (env.POCKETBASE_PROXY_SECRET || process.env.POCKETBASE_PROXY_SECRET)?.trim() || undefined
}

/**
 * Fails fast in production when the PocketBase proxy secret is missing, and warns in development.
 * The secret lets PocketBase tell SvelteKit's server-side calls apart from direct client calls.
 */
export function assertProxySecretConfigured(): void {
  if (getProxySecret()) return

  const message =
    'POCKETBASE_PROXY_SECRET is not set. PocketBase rejects direct authentication requests without it (see pb_hooks/proxy_guard.pb.js).'

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${message} Set it to a long random value, e.g. "openssl rand -hex 32".`)
  }
  console.warn(`[security] ${message}`)
}

/**
 * Creates a server-side PocketBase client that proves to PocketBase that the request
 * originates from SvelteKit and not from a browser talking to PocketBase directly.
 */
export function createServerPocketBase(baseUrl: string = POCKETBASE_URL): PocketBase {
  const pb = new PocketBase(baseUrl)

  pb.beforeSend = (url, options) => {
    const secret = getProxySecret()
    if (secret) {
      options.headers = { ...options.headers, [PROXY_SECRET_HEADER]: secret }
    }
    return { url, options }
  }

  return pb
}
