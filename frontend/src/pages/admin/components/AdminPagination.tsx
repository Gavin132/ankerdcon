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
    <div className="flex items-center justify-between gap-3 border-t-1.5 border-line px-4 py-3">
      <p className="font-mono text-[11.5px] tabular-nums text-ink-3">
        {from}–{to} van {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-8 w-8 items-center justify-center text-xs text-ink-3"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-semibold tabular-nums transition-colors ${
                p === page
                  ? "bg-ink text-paper dark:bg-brand dark:text-brand-on"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
