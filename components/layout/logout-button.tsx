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
        className="rounded-control px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        Salir
      </button>
    </form>
  );
}
