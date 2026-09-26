import { Activity } from "lucide-react";
import { STATUS_PAGE_URL } from "../../constants";

/**
 * Sends someone stuck on a failure screen to the public status page. Whether
 * it's us or their reception is the first thing they'll wonder, and that page
 * is hosted apart from this app, so it still loads when the app doesn't.
 */
export function StatusLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={STATUS_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-text hover:underline ${className}`}
    >
      <Activity size={13} />
      Ligt het aan ons? Bekijk de serverstatus
    </a>
  );
}
