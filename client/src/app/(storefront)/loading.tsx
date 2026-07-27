import { Skeleton } from '@/components/ui/feedback';

/** Route-level loading shell. Mirrors the catalogue layout to avoid a jolt. */
export default function Loading(): JSX.Element {
  return (
    <div className="container py-10">
      <Skeleton className="h-4 w-52" />
      <Skeleton className="mt-6 h-9 w-80" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 4 }, (_, index) => (
            // eslint-disable-next-line react/no-array-index-key -- decorative
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            // eslint-disable-next-line react/no-array-index-key -- decorative
            <div key={index} className="space-y-3 rounded-lg border border-border bg-white p-4">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
