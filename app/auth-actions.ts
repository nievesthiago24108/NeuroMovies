"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  isAuthEnabled,
  safeNextPath,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
} from "@/lib/auth";

export type LoginState = { error: string } | undefined;

/** Validate the password and set the signed session cookie. */
export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const next = safeNextPath(formData.get("next")?.toString() ?? "/");

  // Auth disabled (no APP_PASSWORD): just continue.
  if (!isAuthEnabled()) redirect(next);

  const password = formData.get("password")?.toString() ?? "";
  if (!(await verifyPassword(password))) {
    return { error: "Contraseña incorrecta." };
  }

  const token = await createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(next);
}

/** Clear the session cookie. */
export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
