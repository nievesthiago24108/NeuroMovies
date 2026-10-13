import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Biblioteca",
};

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Mi biblioteca</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todo lo que viste, estás viendo o querés ver.
        </p>
      </header>
      <EmptyState
        title="Nada por aquí todavía"
        description="Cuando agregues películas o series, van a aparecer en tu biblioteca."
      />
    </div>
  );
}