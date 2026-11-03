import PocketBase, { BaseAuthStore } from 'pocketbase'
import { writable } from 'svelte/store'

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8095'

export const pb = new PocketBase(POCKETBASE_URL, new BaseAuthStore())

export const currentUser = writable(pb.authStore.record)

if (typeof document !== 'undefined') {
	pb.authStore.loadFromCookie(document.cookie)
	currentUser.set(pb.authStore.record)

	pb.authStore.onChange((_token, model) => {
		currentUser.set(model)
		document.cookie = pb.authStore.exportToCookie({
			httpOnly: false,
			sameSite: 'lax',
			secure: import.meta.env.PROD
		})
	})
} else {
	pb.authStore.onChange((_token, model) => {
		currentUser.set(model)
	})
}
