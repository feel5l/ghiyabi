export function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={`skeleton ${width} ${height}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-3 shadow-sm">
      <SkeletonLine width="w-1/3" height="h-3" />
      <SkeletonLine width="w-2/3" height="h-5" />
      <SkeletonLine width="w-1/2" height="h-3" />
      <div className="pt-2">
        <SkeletonLine width="w-full" height="h-10" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border">
      <SkeletonLine width="w-8" height="h-8" />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="w-1/3" height="h-4" />
        <SkeletonLine width="w-1/5" height="h-3" />
      </div>
      <SkeletonLine width="w-24" height="h-8" />
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <SkeletonLine width="w-1/2" height="h-3" />
      <div className="mt-3">
        <SkeletonLine width="w-1/3" height="h-8" />
      </div>
      <div className="mt-2">
        <SkeletonLine width="w-2/3" height="h-3" />
      </div>
    </div>
  );
}
