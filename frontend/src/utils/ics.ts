import type { Ride, Meal } from "../types";

function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcs(fields: {
  uid: string;
  dtstart: string;
  summary: string;
  location?: string;
  description?: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ankerd Con//NL",
    "BEGIN:VEVENT",
    `UID:${fields.uid}`,
    `DTSTART:${fields.dtstart}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `SUMMARY:${escape(fields.summary)}`,
  ];
  if (fields.location) lines.push(`LOCATION:${escape(fields.location)}`);
  if (fields.description) lines.push(`DESCRIPTION:${escape(fields.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadIcs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shareOrDownloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const file = new File([blob], filename, { type: "text/calendar" });

  if (navigator.canShare?.({ files: [file] })) {
    // Must NOT be awaited — share() must run synchronously within the user gesture
    navigator.share({ files: [file], title: filename }).catch(() => {
      downloadIcs(blob, filename);
    });
    return;
  }

  downloadIcs(blob, filename);
}

export function exportRideToIcs(ride: Ride) {
  const directionLabel =
    ride.direction === "Inbound" ? "Heen" : ride.direction === "Outbound" ? "Terug" : "Restaurant";
  const summary = `${directionLabel} — ${ride.start_location}`;
  const description =
    ride.direction === "Restaurant"
      ? `Organisator: ${ride.driver}${ride.action_required ? "\nActie vereist" : ""}`
      : [
          `Chauffeur: ${ride.driver}`,
          ride.passengers.length > 0 ? `Meerijders: ${ride.passengers.join(", ")}` : "",
          ride.parking_info ? `Parkeerinfo: ${ride.parking_info}` : "",
        ]
          .filter(Boolean)
          .join("\n");

  const ics = buildIcs({
    uid: `ride-${ride.id}@ankerdcon`,
    dtstart: formatIcsDate(ride.departure_time),
    summary,
    location: ride.start_location,
    description,
  });

  shareOrDownloadIcs(ics, `rit-${ride.id}.ics`);
}

export function exportMealToIcs(meal: Meal) {
  const description = [
    meal.participants.length > 0 ? `Aangemeld: ${meal.participants.join(", ")}` : "",
    meal.cost ? `Kosten p.p.: ${meal.cost}` : "",
    meal.transport_needed ? "Vervoer nodig vanuit hotel" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ics = buildIcs({
    uid: `meal-${meal.id}@ankerdcon`,
    dtstart: formatIcsDate(meal.time),
    summary: meal.meal_name,
    location: meal.location || undefined,
    description: description || undefined,
  });

  shareOrDownloadIcs(ics, `maaltijd-${meal.id}.ics`);
}
