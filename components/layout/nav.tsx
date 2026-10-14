import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { isAuthEnabled } from "@/lib/auth";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/biblioteca", label: "Biblioteca" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-zinc-50/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          NeuroMovies
        </Link>
        <ul className="ml-2 flex items-center gap-1 sm:ml-4">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1">
          {isAuthEnabled() ? <LogoutButton /> : null}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}