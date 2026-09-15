import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { buildEmbedUrl } from "../../utils/maps";

interface RoutePreviewProps {
  start: string;
  end: string;
}

export function RoutePreview({ start, end }: RoutePreviewProps) {
  const [committed, setCommitted] = useState({ start: "", end: "" });

  useEffect(() => {
    if (!start.trim()) {
      setCommitted({ start: "", end: "" });
      return;
    }
    const t = setTimeout(
      () => setCommitted({ start: start.trim(), end: end.trim() }),
      900,
    );
    return () => clearTimeout(t);
  }, [start, end]);

  if (!committed.start) return null;

  const src = buildEmbedUrl(committed.start, committed.end || undefined);
  const label = committed.end ? "Route preview" : "Locatie preview";

  return (
    <div className="relative mt-2 overflow-hidden rounded-xl border-1.5 border-line">
      <iframe
        key={src}
        title={label}
        src={src}
        className="w-full h-36 border-0 block"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink-2">
        <MapPin size={10} className="text-ink-3" />
        {label}
      </div>
    </div>
  );
}
