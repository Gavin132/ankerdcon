import { useState, useRef, useEffect } from "react";
import { MapPin, Search, X, Loader2 } from "lucide-react";

interface NominatimPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
  placeholder?: string;
}

/**
 * Location search input backed by the free Nominatim / OpenStreetMap API.
 * No API key required. Shows a results dropdown and a mini OSM map preview
 * once a place is selected.
 */
export function LocationSearchInput({
  value,
  onChange,
  inputClassName = "",
  placeholder = "Zoek restaurant of adres…",
}: LocationSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input when parent resets value (e.g. open different meal to edit)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleInput(q: string) {
    setQuery(q);
    onChange(q); // keep RHF in sync while typing
    clearTimeout(debounceRef.current);

    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "nl,en" } },
        );
        const data: NominatimPlace[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function selectPlace(place: NominatimPlace) {
    // Use the first 3 comma-segments of the display_name as the stored location
    // (e.g. "Pizzeria Roma, Marnixstraat 280, Amsterdam" — clean and map-searchable)
    const clean = place.display_name.split(",").slice(0, 3).join(",").trim();
    setQuery(clean);
    onChange(clean);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setQuery("");
    onChange("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* ── Search input ───────────────────────────────────── */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 z-10 flex items-center">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-sky-400" />
          ) : (
            <Search size={14} className="text-slate-500" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className={`${inputClassName} pl-9 ${query ? "pr-9" : "pr-3"}`}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Dropdown results ───────────────────────────────── */}
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-white/[0.08] bg-[#141c2e] shadow-2xl overflow-hidden">
          {results.map((place) => {
            const parts = place.display_name.split(",");
            const name = parts[0].trim();
            const sub = parts.slice(1, 3).join(",").trim();
            return (
              <button
                key={place.place_id}
                type="button"
                onClick={() => selectPlace(place)}
                className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left
                           hover:bg-white/[0.06] transition-colors
                           border-b border-white/[0.04] last:border-0"
              >
                <MapPin size={13} className="text-sky-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{name}</p>
                  {sub && <p className="text-xs text-slate-500 truncate mt-0.5">{sub}</p>}
                </div>
              </button>
            );
          })}
          <p className="px-3.5 py-2 text-[10px] text-slate-600 border-t border-white/[0.04]">
            © OpenStreetMap contributors
          </p>
        </div>
      )}

    </div>
  );
}
