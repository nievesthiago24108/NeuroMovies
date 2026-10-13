import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb/images";
import { STATUS_LABEL, type LibraryItem } from "@/lib/library-types";

function HomePosterCard({ item }: { item: LibraryItem }) {
  const poster = posterUrl(item.posterPath, "w342");
  const href = item.mediaType === "movie" ? `/pelicula/${item.tmdbId}` : `/serie/${item.tmdbId}`;

  return (
    <article className="flex flex-col gap-1.5">
      <Link href={href} className="relative block aspect-[2/3] overflow-hidden rounded-lg shadow">
        {poster ? (
          <Image
            src={poster}
            alt={item.title}
            fill
            sizes="(min-width: 768px) 16vw, (min-width: 640px) 25vw, 50vw"
            className="object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-xs text-zinc-500 dark:bg-zinc-800">
            Sin póster
          </div>
        )}
      </Link>
      <Link href={href} className="line-clamp-2 text-sm font-medium hover:underline">
        {item.title}
        {item.year ? ` (${item.year})` : ""}
      </Link>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{STATUS_LABEL[item.status]}</span>
        {item.rating != null ? (
          <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400">
              <path d="M12 2.5l2.84 5.75 6.35.93-4.6 4.48 1.09 6.33L12 17.02l-5.68 2.97 1.09-6.33-4.6-4.48 6.35-.93L12 2.5z" />
            </svg>
            {item.rating.toFixed(item.mediaType === "movie" ? 0 : 1)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function PosterRow({ items }: { items: LibraryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
      {items.map((item) => (
        <HomePosterCard key={item.titleId} item={item} />
      ))}
    </div>
  );
}
