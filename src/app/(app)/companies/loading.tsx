export default function CompaniesLoading() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Companies</h1>
      <div className="mb-4 flex items-center gap-4">
        <div className="h-9 w-full max-w-xs animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-9 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-16 animate-pulse rounded-lg border bg-neutral-100 dark:bg-neutral-800"
          />
        ))}
      </ul>
    </div>
  );
}
