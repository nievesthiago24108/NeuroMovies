import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb/images";
import { STATUS_LABEL, type LibraryItem } from "@/lib/library-types";

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-rating">
      <path d="M12 2.5l2.84 5.75 6.35.93-4.6 4.48 1.09 6.33L12 17.02l-5.68 2.97 1.09-6.33-4.6-4.48 6.35-.93L12 2.5z" />
    </svg>
  );
}

function HomePosterCard({ item }: { item: LibraryItem }) {
  const poster = posterUrl(item.posterPath, "w342");
  const href = item.mediaType === "movie" ? `/pelicula/${item.tmdbId}` : `/serie/${item.tmdbId}`;

  return (
    <article className="flex flex-col gap-1.5">
      <Link
        href={href}
        className="group relative block aspect-[2/3] overflow-hidden rounded-card border border-line bg-surface-2"
      >
        {poster ? (
          <Image
            src={poster}
            alt={item.title}
            fill
            sizes="(min-width: 768px) 16vw, (min-width: 640px) 25vw, 50vw"
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            Sin póster
          </div>
        )}
      </Link>
      <Link href={href} className="line-clamp-2 text-sm font-medium transition-colors hover:text-accent">
        {item.title}
        {item.year ? ` (${item.year})` : ""}
      </Link>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>{STATUS_LABEL[item.status]}</span>
        {item.rating != null ? (
          <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
            <StarIcon />
            {item.rating.toFixed(item.mediaType === "movie" ? 0 : 1)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function PosterRow({ items }: { items: LibraryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
      {items.map((item) => (
        <HomePosterCard key={item.titleId} item={item} />
      ))}
    </div>
  );
}
