import type { MergeUserResult } from "../services/admin.service";

/** [singular, plural] of what a merge moves, in the order the preview lists them. A kind that is not here is not shown. */
const MOVED: [string, [string, string]][] = [
  ["rides", ["rit", "ritten"]],
  ["meals", ["activiteit", "activiteiten"]],
  ["trip_days", ["aanmelding voor een dag", "aanmeldingen voor een dag"]],
  ["hotel_rooms", ["hotelkamer", "hotelkamers"]],
  ["expenses", ["uitgave", "uitgaven"]],
  ["expense_shares", ["aandeel in een uitgave", "aandelen in uitgaven"]],
  ["settlements", ["afrekening", "afrekeningen"]],
  ["cosplays", ["cosplay", "cosplays"]],
  ["photos", ["foto of video", "foto's of video's"]],
  ["ride_costs", ["ritkosten", "ritkosten"]],
  ["parking_spots", ["parkeerplek", "parkeerplekken"]],
  ["feedback", ["feedbackbericht", "feedbackberichten"]],
  ["badges", ["badge", "badges"]],
];

/** What is left out instead of moved (the member already has it, or it would be a payment to oneself). */
const DROPPED: [string, [string, string]][] = [
  ["settlements", ["afrekening tussen hen beiden", "afrekeningen tussen hen beiden"]],
  ["ride_costs", ["ritkosten die het lid al heeft", "ritkosten die het lid al heeft"]],
  ["parking_spots", ["parkeerplek die het lid al heeft", "parkeerplekken die het lid al heeft"]],
  ["restaurant_cars", ["auto naar een restaurant die samengaat met die van het lid", "auto's naar een restaurant die samengaan met die van het lid"]],
];

function list(table: [string, [string, string]][], counts: Record<string, number>): string[] {
  return table
    .filter(([key]) => (counts[key] ?? 0) > 0)
    .map(([key, [one, many]]) => `${counts[key]} ${counts[key] === 1 ? one : many}`);
}

/** "3 ritten", "1 uitgave", ... what the merge moves; empty when the placeholder is not on anything. */
export function movedParts(result: Pick<MergeUserResult, "counts">): string[] {
  return list(MOVED, result.counts);
}

/** What the merge leaves out, in the same shape. */
export function droppedParts(result: Pick<MergeUserResult, "dropped">): string[] {
  return list(DROPPED, result.dropped);
}
