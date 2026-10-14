import "server-only";

import { cookies } from "next/headers";
import { isAuthEnabled, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Whether the current request carries a valid session.
 *
 * Returns `true` when authentication is disabled (no `APP_PASSWORD`
 * configured), so local development works without setting it up.
 *
 * Used to re-verify auth inside Server Actions, close to the data
 * (Proxy already performs the optimistic, cookie-only check).
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
