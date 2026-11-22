import { Search } from "lucide-react";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
};

export function SearchField({
  value,
  onChange,
  placeholder = "بحث...",
  className = "",
  id,
}: SearchFieldProps) {
  return (
    <div className={`relative ${className}`} dir="rtl">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pe-3 ps-10 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  );
}