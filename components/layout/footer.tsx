import { TMDBAttribution } from "@/components/tmdb/tmdb-attribution";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 sm:px-6">
        <p className="text-sm font-semibold">NeuroMovies</p>
        <TMDBAttribution />
      </div>
    </footer>
  );
}
