export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded-control bg-surface-2" />
        <div className="h-4 w-72 animate-pulse rounded-control bg-surface-2" />
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-card bg-surface-2" />
        ))}
      </div>
    </div>
  );
}