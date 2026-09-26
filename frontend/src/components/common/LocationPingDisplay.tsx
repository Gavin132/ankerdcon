import { ExternalLink } from "lucide-react";
import { isPingFresh, parsePing, pingAgo, pingMapUrl } from "../../utils/locationPing";

interface Props {
  raw: string;
  align?: "start" | "end";
}

/** A shared location: the note (or zone), how long ago, and a map link when it has a GPS pin. Renders nothing once it has expired. */
export function LocationPingDisplay({ raw, align = "end" }: Props) {
  const ping = parsePing(raw);
  if (!ping || !isPingFresh(raw)) return null;

  const label = ping.text || ping.zone || "Locatie gedeeld";
  const meta = [ping.text ? ping.zone : null, ping.at ? pingAgo(ping.at) : null].filter(Boolean).join(" · ");
  const hasPin = ping.lat !== undefined && ping.lng !== undefined;

  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${align === "start" ? "items-start" : "items-end"}`}>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
        {label}
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-ink-3">
        {meta}
        {hasPin && (
          <a
            href={pingMapUrl(ping.lat!, ping.lng!)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 font-sans font-semibold text-brand-text hover:underline"
          >
            Kaart <ExternalLink size={10} />
          </a>
        )}
      </span>
    </div>
  );
}
