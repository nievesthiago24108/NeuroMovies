import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/ui/empty-state";
import { LibraryGrid } from "@/components/library/library-grid";
import { SyncAllButton } from "@/components/library/sync-all-button";
import { WishlistRoulette } from "@/components/library/wishlist-roulette";
import { countTvTitles, getLibraryItems } from "@/lib/library";

export const metadata: Metadata = {
  title: "Biblioteca",
};

// Reads live data from PostgreSQL, so render per request.
export const instant = false;

export default async function LibraryPage() {
  // Database reads must run per request, not during prerendering.
  await connection();
  const items = await getLibraryItems();
  const seriesCount = await countTvTitles();
  const wishlistMovies = items.filter(
    (item) => item.mediaType === "movie" && item.status === "wishlist",
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Mi biblioteca</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Todo lo que viste, estás viendo o querés ver.
          </p>
        </div>
        {seriesCount > 0 ? <SyncAllButton /> : null}
      </header>

      {wishlistMovies.length > 0 ? <WishlistRoulette items={wishlistMovies} /> : null}

      {items.length === 0 ? (
        <EmptyState
          title="Nada por aquí todavía"
          description="Cuando agregues películas o series, van a aparecer en tu biblioteca."
        />
      ) : (
        <LibraryGrid items={items} />
      )}
    </div>
  );
}
