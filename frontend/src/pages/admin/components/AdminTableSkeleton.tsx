interface Props {
  cols: number;
  rows?: number;
}

/** Placeholder rows for a table that is loading (`cols` = the number of columns of the table). */
export function AdminTableSkeleton({ cols, rows = 4 }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={cols} className="!p-3">
            <div className="h-8 animate-pulse rounded-xl bg-sunken" />
          </td>
        </tr>
      ))}
    </>
  );
}
