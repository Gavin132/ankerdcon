import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: Props) {
  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  // Show at most 7 page buttons with ellipsis logic
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 2) pages.push("…");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 3) pages.push("…");
    pages.push(totalPages - 1);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
      <p className="text-xs text-slate-400">
        {from}–{to} van {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-8 w-8 items-center justify-center text-xs text-slate-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? "bg-sky-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] dark:text-slate-400"
              }`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
