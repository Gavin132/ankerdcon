import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldX } from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/auth.store";
import { APP_NAME } from "../constants";

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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-paper px-6 py-12 select-none">
      <motion.div
        className="flex max-w-sm flex-col items-center text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <img
          src="/assets/images/ankerd-logo.webp"
          alt=""
          className="mb-5 h-16 w-16 object-contain"
          draggable={false}
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <ShieldX size={24} />
        </div>

        <h1 className="mt-4 font-display text-[42px] font-extrabold uppercase leading-[0.95] text-ink">
          Geen toegang
        </h1>
        {viaGoogle ? (
          <div className="mt-3 max-w-[320px] space-y-2 text-sm leading-relaxed text-ink-2">
            <p>
              Dit Google-account{email ? <> (<span className="font-semibold text-ink">{email}</span>)</> : null} is niet gekoppeld aan een profiel op {APP_NAME}.
            </p>
            <p>
              Heb je je eerder aangemeld met Discord? Log dan uit en kies <span className="font-semibold text-ink">Inloggen met Discord</span>: Discord en Google zijn aparte logins.
            </p>
            <p>Log je voor het eerst in? Neem dan contact op met een beheerder.</p>
          </div>
        ) : (
          <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-ink-2">
            Je Discord-account staat niet op de toegangslijst voor {APP_NAME}.
            Neem contact op met een beheerder.
          </p>
        )}

        <button
          onClick={handleSignOut}
          className="btn-primary mt-7 px-5 py-2.5 text-sm"
        >
          Uitloggen
        </button>
      </motion.div>
    </div>
  );
}
