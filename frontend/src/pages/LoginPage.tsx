import { motion } from "framer-motion";
import { LoginForm } from "../components/auth/LoginForm";

export function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper pt-[env(safe-area-inset-top,0px)]">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        {/* Hero branding */}
        <motion.div
          className="mb-8 flex flex-col items-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <img
            src="/assets/images/ankerd-logo.webp"
            alt=""
            className="mb-4 h-16 w-16 object-contain"
          />
          <h1 className="font-display text-[52px] font-black uppercase leading-[0.88] tracking-[0.01em] text-ink">
            Ankerd Con
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
            Jouw leden portal voor het evenement
          </p>
        </motion.div>

        {/* Login card */}
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="rounded-[14px] border-2 border-outline bg-surface p-6 sm:p-7">
            <LoginForm />
          </div>

          <p className="mt-5 text-center text-xs text-ink-3">
            Alleen toegankelijk voor Ankerd members
          </p>
        </motion.div>
      </div>
    </div>
  );
}
