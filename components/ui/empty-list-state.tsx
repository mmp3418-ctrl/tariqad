import type { ReactNode } from "react";

type EmptyListStateProps = {
  message: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyListState({
  message,
  hint,
  action,
  className = "",
}: EmptyListStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center ${className}`}
    >
      <p className="text-sm font-medium text-slate-400">{message}</p>
      {hint ? (
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}