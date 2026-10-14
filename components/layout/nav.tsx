import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { NavLinks } from "@/components/layout/nav-links";
import { isAuthEnabled } from "@/lib/auth";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <Image
            src="/images/logo-mark.png"
            alt=""
            width={28}
            height={28}
            priority
            className="h-7 w-7 shrink-0 invert transition-transform group-hover:scale-105 dark:invert-0"
          />
          <span className="font-display text-xl font-semibold tracking-tight">
            NeuroMovies
          </span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-1">
          {isAuthEnabled() ? <LogoutButton /> : null}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
