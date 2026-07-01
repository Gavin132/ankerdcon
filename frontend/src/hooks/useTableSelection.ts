import { useState, useEffect } from "react";

/**
 * Generic multi-row selection state for admin tables.
 * `pageIds` should be the IDs of rows currently visible (the current page).
 */
export function useTableSelection(pageIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset confirm state is handled by the bulk bar internally.
  // If the page changes, clear selection to avoid ghost selections.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageIds.join(",")]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageIds));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id));
  const indeterminate = someSelected && !allSelected;

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    allSelected,
    someSelected,
    indeterminate,
  };
}
