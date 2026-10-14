"use client";

import { usePathname } from "next/navigation";
import { logout } from "@/app/auth-actions";

export function LogoutButton() {
  const pathname = usePathname();
  // Nothing to log out from the login screen itself.
  if (pathname === "/login") return null;

  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        Salir
      </button>
    </form>
  );
}
