interface Props {
  cols: number;
  rows?: number;
}

export function AdminTableSkeleton({ cols, rows = 4 }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={cols} className="px-5 py-3">
            <div className="h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}
