import { useEffect, useState } from "react";
import { ShieldX } from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/auth.store";
import { APP_NAME } from "../constants";
import { StatusScreen } from "../components/common/StatusScreen";

/** `onSignOut` lets the admin preview show this screen without really signing out;
 * `previewProvider` lets it show the Google variant too. */
export function ForbiddenPage({ onSignOut, previewProvider }: { onSignOut?: () => void; previewProvider?: "google" } = {}) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  // Someone refused after signing in with Google has usually signed up with
  // Discord before: the two are separate logins, and only Discord is on the list.
  const [provider, setProvider] = useState<string | undefined>(previewProvider);
  const [email, setEmail] = useState<string | undefined>(previewProvider ? "naam@gmail.com" : undefined);
  useEffect(() => {
    if (previewProvider) return;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setProvider(user?.app_metadata?.provider);
      setEmail(user?.email ?? undefined);
    }).catch(() => {});
  }, [previewProvider]);
  const viaGoogle = provider === "google";

  async function handleSignOut() {
    if (onSignOut) return onSignOut();
    await supabase.auth.signOut();
    clearAuth();
  }

  return (
    <StatusScreen
      mark={{ icon: <ShieldX size={24} />, tone: "bad" }}
      title="Geen toegang"
      actions={
        <button onClick={handleSignOut} className="btn-primary px-5">
          Uitloggen
        </button>
      }
    >
      {viaGoogle ? (
        <>
          <p>
            Dit Google-account{email ? <> (<span className="font-semibold text-ink">{email}</span>)</> : null} is niet gekoppeld aan een profiel op {APP_NAME}.
          </p>
          <p>
            Heb je je eerder aangemeld met Discord? Log dan uit en kies <span className="font-semibold text-ink">Inloggen met Discord</span>: Discord en Google zijn aparte logins.
          </p>
          <p>Log je voor het eerst in? Neem dan contact op met een beheerder.</p>
        </>
      ) : (
        <p>
          Je Discord-account staat niet op de toegangslijst voor {APP_NAME}.
          Neem contact op met een beheerder.
        </p>
      )}
    </StatusScreen>
  );
}
