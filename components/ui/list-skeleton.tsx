type ListSkeletonProps = {
  rows?: number;
  className?: string;
};

export function ListSkeleton({ rows = 4, className = "" }: ListSkeletonProps) {
  return (
    <div
      className={`space-y-2 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 sm:p-6 ${className}`}
      dir="rtl"
      aria-busy
      aria-label="جاري التحميل"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
        >
          <span className="size-12 shrink-0 rounded-xl bg-slate-800/90" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <span className="block h-4 w-3/5 max-w-xs rounded-md bg-slate-800/90" />
            <span className="block h-3 w-2/5 max-w-[10rem] rounded-md bg-slate-800/60" />
          </div>
          <span className="hidden h-8 w-20 shrink-0 rounded-lg bg-slate-800/50 sm:block" />
        </div>
      ))}
    </div>
  );
}