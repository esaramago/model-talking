import PocketBase, { BaseAuthStore } from 'pocketbase'

// In browser environments, route all requests through SvelteKit's same-origin proxy
// to enforce rate-limiting, 2FA verification, and prevent direct PocketBase bypasses.
const POCKETBASE_URL =
	typeof window !== 'undefined'
		? window.location.origin
		: import.meta.env.INTERNAL_POCKETBASE_URL || 'http://127.0.0.1:8095'

export const pb = new PocketBase(POCKETBASE_URL, new BaseAuthStore())

if (typeof document !== 'undefined') {
	pb.authStore.loadFromCookie(document.cookie)

	pb.authStore.onChange(() => {
		document.cookie = pb.authStore.exportToCookie({
			httpOnly: false,
			sameSite: 'lax',
			secure: import.meta.env.PROD
		})
	})
}
