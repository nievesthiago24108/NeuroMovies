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
        <h2 className="text-lg font-semibold">{title}</h2>
        {action ? (
          <Link href={action.href} className="text-xs font-medium text-teal-600 hover:underline">
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
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">NeuroMovies</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tu seguimiento personal de películas y series.
        </p>
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
