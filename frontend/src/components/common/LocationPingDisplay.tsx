/** Parses the raw spreadsheet value "zone|text (at HH:MM)" into parts. */
function parsePing(raw: string): { zone: string | null; text: string; time: string | null } {
  const timeMatch = raw.match(/\(at (\d{2}:\d{2})\)$/);
  const time = timeMatch ? timeMatch[1] : null;
  const withoutTime = raw.replace(/\s*\(at \d{2}:\d{2}\)$/, "").trim();
  const pipeIdx = withoutTime.indexOf("|");
  if (pipeIdx !== -1) {
    return {
      zone: withoutTime.slice(0, pipeIdx).trim() || null,
      text: withoutTime.slice(pipeIdx + 1).trim(),
      time,
    };
  }
  return { zone: null, text: withoutTime, time };
}

interface Props {
  raw: string;
  align?: "start" | "end";
}

export function LocationPingDisplay({ raw, align = "end" }: Props) {
  const { zone, text, time } = parsePing(raw);
  const label = text || zone || raw;
  const meta = [zone, time].filter(Boolean).join(" · ");

  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${align === "start" ? "items-start" : "items-end"}`}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
        {label}
      </span>
      {meta && (
        <span className="text-xs text-slate-400 whitespace-nowrap">{meta}</span>
      )}
    </div>
  );
}
