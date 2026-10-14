export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-surface/50 px-6 py-12 text-center">
      {/* Decorative SVG art: plain <img> avoids the image optimizer for vectors. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/empty-seats.svg"
        alt="Fila de butacas vacías de cine"
        width={280}
        height={132}
        className="opacity-85"
      />
      <p className="text-base font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}