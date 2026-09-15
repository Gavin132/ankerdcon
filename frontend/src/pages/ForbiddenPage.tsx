import { motion } from "framer-motion";
import { ShieldX } from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/auth.store";
import { APP_NAME } from "../constants";

export function ForbiddenPage() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleSignOut() {
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
          src="/assets/images/ankerd-logo.png"
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
        <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-ink-2">
          Je Discord-account staat niet op de toegangslijst voor {APP_NAME}.
          Neem contact op met een beheerder.
        </p>

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
