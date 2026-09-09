import { motion } from "framer-motion";
import { ShieldX } from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/auth.store";
import { APP_NAME } from "../constants";
import { NightSkyBackdrop } from "../components/common/NightSkyBackdrop";

export function ForbiddenPage() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleSignOut() {
    await supabase.auth.signOut();
    clearAuth();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(170deg, #050c1e 0%, #081c3a 40%, #0c2d58 80%, #0e3460 100%)" }}
    >
      <NightSkyBackdrop />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-5 px-8 text-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{ background: "rgba(239,68,68,0.18)", border: "1.5px solid rgba(239,68,68,0.35)" }}
        >
          <ShieldX size={38} className="text-rose-400" />
        </div>

        <div>
          <p className="text-[28px] font-black text-white leading-tight">Geen toegang</p>
          <p className="mt-2 text-sm text-white/50 max-w-[280px] leading-relaxed">
            Je Discord-account staat niet op de toegangslijst voor {APP_NAME}.
            Neem contact op met een beheerder.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white/60 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Uitloggen
        </button>
      </motion.div>
    </div>
  );
}
