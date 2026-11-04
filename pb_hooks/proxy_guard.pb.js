/// <reference path="../pb_data/types.d.ts" />

// Only SvelteKit may call user authentication, registration and batch endpoints.
// This keeps 2FA and rate limiting from being bypassed if PocketBase is ever reachable directly.
// The superusers collection is exempt so the PocketBase admin UI keeps working.
routerUse((e) => {
  const path = e.request.url.path.toLowerCase().replace(/\/+/g, "/").replace(/\/$/, "")
  const method = e.request.method.toUpperCase()
  const superuserCollections = ["_superusers", "pbc_3142635823"]

  const authMatch = path.match(
    /^\/api\/collections\/([^/]+)\/(auth-with-password|auth-with-otp|request-otp|auth-with-oauth2)$/
  )
  const createMatch = path.match(/^\/api\/collections\/([^/]+)\/records$/)

  const isProtected =
    path === "/api/batch" ||
    (authMatch !== null && superuserCollections.indexOf(authMatch[1]) === -1) ||
    (method === "POST" &&
      createMatch !== null &&
      (createMatch[1] === "users" || createMatch[1] === "_pb_users_auth_"))

  if (!isProtected) {
    return e.next()
  }

  const expected = $os.getenv("POCKETBASE_PROXY_SECRET")
  const provided = e.request.header.get("X-MT-Proxy-Secret")

  if (!expected || !provided || !$security.equal(provided, expected)) {
    throw new ForbiddenError("Direct access to this endpoint is disabled.")
  }

  return e.next()
})
