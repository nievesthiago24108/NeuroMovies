import Link from "next/link";

export function NotFound() {
  return (
    <div className="flex flex-col items-center gap-8 py-12 sm:py-16">
      <div className="relative flex flex-col items-center gap-6 text-center">
        {/* Decorative SVG art: plain <img> avoids the image optimizer for vectors. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/film-reel.svg"
          alt="Ilustración de un rollo de película"
          width={160}
          height={160}
          className="opacity-85"
        />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Página no encontrada
          </h1>
          <p className="max-w-lg text-sm text-muted">
            El enlace que abriste no existe o cambió de lugar.
          </p>
        </div>
      </div>
      <Link
        href="/"
        className="rounded-control bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition hover:bg-accent-strong"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

export default NotFound;
