import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/ui/empty-state";
import { LibraryGrid } from "@/components/library/library-grid";
import { getLibraryItems } from "@/lib/library";

export const metadata: Metadata = {
  title: "Biblioteca",
};

// Reads from a synchronous SQLite driver, so render per request.
export const instant = false;

export default async function LibraryPage() {
  // Synchronous SQLite reads must run per request, not during prerendering.
  await connection();
  const items = await getLibraryItems();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Mi biblioteca</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todo lo que viste, estás viendo o querés ver.
        </p>
      </header>

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
