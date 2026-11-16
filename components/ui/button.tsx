import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 shadow-sm disabled:bg-teal-400",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:bg-slate-50",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:bg-rose-300",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  outline:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:bg-slate-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
