import { useState, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "./UserAvatar";
import { TOKENS } from "../../constants";
import { NamePickerProps, MultiProps, SingleProps } from "../../types";
import { useUsers } from "../../hooks/useUsers";

export function NamePicker(props: NamePickerProps) {
  const { options, placeholder = "Zoek naam…", color = "sky" } = props;
  const tk = TOKENS[color];

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: users = [] } = useUsers();

  const isMulti = props.multiple === true;
  const selected = isMulti ? (props as MultiProps).value : [];
  const maxSelect = isMulti ? (props as MultiProps).maxSelect : undefined;
  const atMax = maxSelect !== undefined && selected.length >= maxSelect;

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.toLowerCase();
        if (o.toLowerCase().includes(q)) return true;
        const user = users.find((u) => u.name === o || u.discord_username === o || u.aliases?.includes(o));
        if (!user) return false;
        return (
          user.name.toLowerCase().includes(q) ||
          (user.discord_username ?? "").toLowerCase().includes(q) ||
          (user.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false)
        );
      })
    : [];

  // ── Multi-select: close on outside pointerdown only ──────────────────────
  useEffect(() => {
    if (!isMulti || !open) return;

    function onOutside(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    }

    document.addEventListener("pointerdown", onOutside, true);
    return () => document.removeEventListener("pointerdown", onOutside, true);
  }, [isMulti, open]);

  // ── Single-select: close on blur ─────────────────────────────────────────
  function handleBlur() {
    if (isMulti) return;
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
        setQuery("");
      }
    }, 150);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSingleSelect(name: string) {
    (props as SingleProps).onChange(name);
    setQuery("");
    setOpen(false);
  }

  function handleMultiToggle(name: string) {
    const mp = props as MultiProps;
    if (selected.includes(name)) {
      mp.onChange(selected.filter((n) => n !== name));
    } else if (!atMax) {
      mp.onChange([...selected, name]);
      // Don't clear the query — let the user keep filtering for more names
    }
    // Always keep the list open after a toggle
    setOpen(true);
  }

  function handleDeselect(name: string) {
    (props as MultiProps).onChange(selected.filter((n) => n !== name));
    // Keep list open after deselecting a chip
    setOpen(true);
  }

  const singleValue = !isMulti ? (props as SingleProps).value : "";

  return (
    <div ref={containerRef} className="space-y-1.5">
      {/* ── Multi: selected chips + capacity bar ─────────────────────────── */}
      {isMulti && (
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden space-y-2"
            >
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {selected.map((name) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.13 }}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tk.chip}`}
                    >
                      <UserAvatar name={name} className="h-4 w-4 text-[9px] !border-0" />
                      <span>{name}</span>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeselect(name);
                        }}
                        className={`ml-0.5 transition-colors ${tk.chipX}`}
                      >
                        <X size={11} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {maxSelect !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <motion.div
                      className={`h-full rounded-full transition-colors ${atMax ? tk.barFull : tk.bar}`}
                      animate={{ width: `${(selected.length / maxSelect) * 100}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  </div>
                  <span className={`shrink-0 text-xs font-bold tabular-nums ${atMax ? tk.counterFull : tk.counter}`}>
                    {selected.length}/{maxSelect}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Search input ─────────────────────────────────────────────────── */}
      <div className="relative">
        <Search
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input-field pl-8"
          placeholder={placeholder}
          value={open ? query : !isMulti && singleValue ? singleValue : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          // onClick handles the case where the input is already focused (onFocus won't re-fire)
          onClick={() => setOpen(true)}
          onBlur={handleBlur}
          autoComplete="off"
        />
      </div>

      {/* ── Options list ─────────────────────────────────────────────────── */}
      {open && query.trim() && (
        <div className="max-h-[220px] overflow-y-auto overscroll-contain rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs text-slate-400">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map((name) => {
              const isSelected = isMulti && selected.includes(name);
              const isDisabled = isMulti && atMax && !isSelected;

              return (
                <button
                  key={name}
                  type="button"
                  // Use onClick instead of onPointerDown so:
                  // 1. Scroll gestures on the list don't trigger accidental selection
                  // 2. No e.preventDefault() that could interfere with the outside-click detector
                  onClick={() => {
                    if (isMulti) handleMultiToggle(name);
                    else handleSingleSelect(name);
                  }}
                  disabled={isDisabled}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors min-h-[48px] ${
                    isSelected
                      ? tk.activeRow
                      : isDisabled
                        ? "cursor-not-allowed opacity-35"
                        : "hover:bg-slate-50 active:bg-slate-50 dark:hover:bg-slate-800/60 dark:active:bg-slate-800/60"
                  }`}
                >
                  <UserAvatar name={name} className="h-7 w-7 text-xs" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {name}
                    </span>
                    {(() => {
                      const q = query.toLowerCase();
                      const user = users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
                      const matchedAlias = !name.toLowerCase().includes(q)
                        ? user?.aliases?.find((a) => a.toLowerCase().includes(q))
                        : undefined;
                      return matchedAlias ? (
                        <span className="block text-[11px] text-slate-400 truncate">ook bekend als &ldquo;{matchedAlias}&rdquo;</span>
                      ) : null;
                    })()}
                  </span>
                  {isSelected && (
                    <Check size={15} className={`shrink-0 ${tk.check}`} />
                  )}
                  {!isMulti && singleValue === name && (
                    <span className={`h-2 w-2 shrink-0 rounded-full ${tk.dot}`} />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
