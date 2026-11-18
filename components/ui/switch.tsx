"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center gap-2 ${disabled ? "opacity-60" : ""}`}
    >
      {label ? (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {label}
        </span>
      ) : null}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 ${
          checked
            ? "bg-teal-700 dark:bg-teal-500"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "end-0.5" : "end-[1.35rem]"
          }`}
        />
      </button>
    </label>
  );
}
