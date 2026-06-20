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
    <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-100">
      <iframe
        key={src}
        title={label}
        src={src}
        className="w-full h-36 border-0 block"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 pointer-events-none">
        <MapPin size={10} className="text-sky-500" />
        {label}
      </div>
    </div>
  );
}
