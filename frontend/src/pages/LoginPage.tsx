import { motion } from "framer-motion";
import { LoginForm } from "../components/auth/LoginForm";

export function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-600/08 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-sky-300/05 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-12">
        {/* Hero branding */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl gradient-brand shadow-hero"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: "spring", bounce: 0.4 }}
          >
            <span className="text-3xl font-black text-white tracking-tighter">A</span>
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Ankerd Con
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Jouw crew portal voor het evenement
          </p>
        </motion.div>

        {/* Login card */}
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="card-surface rounded-3xl p-7">
            <div className="mb-6">
              <h2 className="text-base font-black text-slate-800">Welkom terug</h2>
              <p className="mt-1 text-sm text-slate-400">
                Voer de groepscode in om toegang te krijgen
              </p>
            </div>
            <LoginForm />
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            Alleen toegankelijk voor Ankerd crew members
          </p>
        </motion.div>
      </div>
    </div>
  );
}
