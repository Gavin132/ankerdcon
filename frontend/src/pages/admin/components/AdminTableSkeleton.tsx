interface Props {
  cols: number;
  rows?: number;
}

export function AdminTableSkeleton({ cols, rows = 4 }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={cols} className="border-b border-line px-4 py-3">
            <div className="h-8 animate-pulse rounded-lg bg-sunken" />
          </td>
        </tr>
      ))}
    </>
  );
}
