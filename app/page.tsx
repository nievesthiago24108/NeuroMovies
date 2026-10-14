import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/ui/empty-state";
import { ContinueWatching } from "@/components/home/continue-watching";
import { PosterRow } from "@/components/home/poster-row";
import { TrendingSection } from "@/components/home/trending-section";
import { getContinueWatching, getLibraryItems } from "@/lib/library";

// Reads live data from PostgreSQL, so render per request.
export const instant = false;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="text-xs font-medium text-accent underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function Home() {
  // Database reads must run per request, not during prerendering.
  await connection();
  const [items, continueWatching] = await Promise.all([
    getLibraryItems(),
    getContinueWatching(),
  ]);

  const wishlist = items.filter((item) => item.status === "wishlist").slice(0, 6);
  const recentlyWatched = items
    .filter((item) => item.status === "watched")
    .sort((a, b) => (b.watchedAt ?? b.addedAt).localeCompare(a.watchedAt ?? a.addedAt))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-12">
      <header className="relative overflow-hidden rounded-card border border-line">
        {/* Decorative: cinematic backdrop for the hero. */}
        <div className="grain absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/cinema-hall.svg"
            alt="Sala de cine a oscuras, con butacas y haces de luz del proyector"
            width={1600}
            height={560}
            className="pointer-events-none h-full w-full object-cover opacity-60"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="relative flex flex-col gap-3 px-6 py-10 sm:px-10 sm:py-14">
          <Image
            src="/images/logo-mark.png"
            alt=""
            width={44}
            height={44}
            priority
            className="h-11 w-11 invert dark:invert-0"
          />
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            NeuroMovies
          </h1>
          <p className="max-w-md text-sm text-muted">
            Tu seguimiento personal de películas y series.
          </p>
        </div>
        <div className="perf relative" aria-hidden="true" />
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Todo listo para empezar"
          description="Buscá una película o serie y agregala a tu biblioteca para verla acá."
        />
      ) : null}

      {continueWatching.length > 0 ? (
        <Section title="Continuar viendo">
          <ContinueWatching items={continueWatching} />
        </Section>
      ) : null}

      {wishlist.length > 0 ? (
        <Section title="Quiero ver" action={{ href: "/biblioteca", label: "Ver todo" }}>
          <PosterRow items={wishlist} />
        </Section>
      ) : null}

      {recentlyWatched.length > 0 ? (
        <Section title="Vistas recientes" action={{ href: "/biblioteca", label: "Ver todo" }}>
          <PosterRow items={recentlyWatched} />
        </Section>
      ) : null}

      <Section title="Tendencias en TMDB">
        <TrendingSection />
      </Section>
    </div>
  );
}
