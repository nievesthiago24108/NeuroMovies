"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/biblioteca", label: "Biblioteca" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="ml-1 hidden items-center gap-0.5 sm:flex">
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative rounded-control px-2.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {link.label}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2.5 -bottom-[3px] h-px bg-accent"
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
