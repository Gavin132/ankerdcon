import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { SearchSelectProps } from "../../types/interfaces";

export function SearchSelect({
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  className = "",
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.trim().length > 0
      ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
      : [];

  // Compute fixed-position coords so the dropdown is never clipped by overflow parents
  const updatePos = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const itemH = 44;
    const maxH = Math.min(filtered.length * itemH + 8, 260);

    if (spaceBelow >= 100) {
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(maxH, spaceBelow),
        zIndex: 9999,
      });
    } else {
      // Open upward when near the bottom of the screen
      const availUp = rect.top - 8;
      setDropdownStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(maxH, availUp),
        zIndex: 9999,
      });
    }
  }, [filtered.length]);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  // Close on outside click or touch
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  // Close when any ancestor scrolls (keeps dropdown from floating detached)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setOpen(true);
  }

  function handleSelect(option: string) {
    onChange(option);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0]);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => {
          if (value.trim().length > 0) setOpen(true);
        }}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="input-field"
      />

      {open && filtered.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900"
          style={dropdownStyle}
        >
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
              className="flex w-full items-center px-3.5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-sky-900/30 dark:hover:text-sky-300"
            >
              {option}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
