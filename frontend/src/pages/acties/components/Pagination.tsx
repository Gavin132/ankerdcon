import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;
  const pages = total <= 7 ? Array.from({ length: total }, (_, i) => i) : null;
  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-slate-400">
        Pagina {page + 1} van {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-white/[0.06] disabled:opacity-30 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {pages ? (
          pages.map((i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                i === page
                  ? "bg-sky-500 text-white"
                  : "text-slate-500 hover:bg-white dark:hover:bg-white/[0.06] border border-slate-200 dark:border-slate-700"
              }`}
            >
              {i + 1}
            </button>
          ))
        ) : (
          <span className="text-xs text-slate-400 px-2">
            {page + 1} / {total}
          </span>
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === total - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-white/[0.06] disabled:opacity-30 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
