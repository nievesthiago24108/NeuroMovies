export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      ) : null}
    </div>
  );
}