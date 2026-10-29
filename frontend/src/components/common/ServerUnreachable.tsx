import { WifiOff } from "lucide-react";
import { StatusScreen } from "./StatusScreen";

/**
 * Shown when the signed-in user's profile can't be loaded (backend down, a 5xx,
 * no reception). The app isn't rendered underneath: its own current-user
 * queries would refetch on mount, flip the query back to loading, unmount the
 * app again and loop forever.
 */
export function ServerUnreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusScreen
      mark={{ icon: <WifiOff size={24} />, tone: "warn" }}
      title="Kan de server niet bereiken"
      statusLink
      actions={
        <button type="button" onClick={onRetry} className="btn-primary px-5">
          Opnieuw proberen
        </button>
      }
    >
      <p>Controleer je verbinding of probeer het zo nog eens.</p>
    </StatusScreen>
  );
}
