import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
}

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    FieldProps {}

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldProps {}

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    FieldProps {
  children: React.ReactNode;
}

const fieldClass =
  "w-full max-w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900";

const labelClass = "text-sm font-medium text-slate-900 dark:text-slate-100";

export function Input({
  label,
  error,
  required,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || props.name;
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5" htmlFor={inputId}>
      <span className={labelClass}>
        {label}
        {required && <span className="ms-1 text-rose-500">*</span>}
      </span>
      <input
        id={inputId}
        required={required}
        className={`${fieldClass} ${error ? "border-rose-400 dark:border-rose-500" : ""} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      )}
    </label>
  );
}

export function Textarea({
  label,
  error,
  required,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const inputId = id || props.name;
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5" htmlFor={inputId}>
      <span className={labelClass}>
        {label}
        {required && <span className="ms-1 text-rose-500">*</span>}
      </span>
      <textarea
        id={inputId}
        required={required}
        className={`${fieldClass} min-h-[96px] resize-y ${error ? "border-rose-400 dark:border-rose-500" : ""} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      )}
    </label>
  );
}

export function Select({
  label,
  error,
  required,
  className = "",
  id,
  children,
  ...props
}: SelectProps) {
  const inputId = id || props.name;
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5" htmlFor={inputId}>
      {label ? (
        <span className={labelClass}>
          {label}
          {required && <span className="ms-1 text-rose-500">*</span>}
        </span>
      ) : null}
      <select
        id={inputId}
        required={required}
        className={`${fieldClass} ${error ? "border-rose-400 dark:border-rose-500" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      )}
    </label>
  );
}
