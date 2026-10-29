import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function AdminSearch({
  value,
  onChange,
  placeholder = "Zoeken…",
}: Props) {
  return (
    <div className="relative w-full max-w-sm">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field rounded-[9px] py-2.5 pl-9 pr-10 text-base sm:text-sm"
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Zoekopdracht wissen"
          className="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
