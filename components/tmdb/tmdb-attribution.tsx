import Link from "next/link";

export function TMDBAttribution() {
  return (
    <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
      <Link
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TMDB (themoviedb.org)"
        className="w-fit opacity-70 transition-opacity hover:opacity-100"
      >
        {/* Static third-party logo: next/image is not suitable for remote SVGs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/tmdb.svg"
          alt="TMDB"
          width={105}
          height={14}
          className="h-3.5 w-auto"
        />
      </Link>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </div>
  );
}