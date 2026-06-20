import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  LogOut,
  BedDouble,
  Phone,
  ChevronRight,
  Navigation,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Badge } from "../components/common/Badge";
import { useUsers, usePingLocation } from "../hooks/useUsers";
import { useAuthStore } from "../store/auth.store";
import { logout } from "../services/auth.service";
import { useNavigate } from "react-router-dom";

const pingSchema = z.object({
  user_name: z.string().min(1, "Verplicht"),
  ping_text: z.string().min(1, "Voer een locatie in"),
});

type PingForm = z.infer<typeof pingSchema>;

const AVATAR_COLORS = [
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export function MorePage() {
  const [pingOpen, setPingOpen] = useState(false);
  const { data: users, isLoading } = useUsers();
  const pingMutation = usePingLocation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PingForm>({ resolver: zodResolver(pingSchema) });

  async function onPing(values: PingForm) {
    await pingMutation.mutateAsync(values);
    reset();
    setPingOpen(false);
  }

  async function onLogout() {
    try { await logout(); } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      {/* Location ping */}
      <motion.div variants={item}>
        <p className="section-label mb-3">Live locatie</p>
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => setPingOpen(true)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand">
              <Navigation size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">Locatie pingen</p>
              <p className="text-xs text-slate-400 mt-0.5">Stuur je locatie naar de groep</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        </div>
      </motion.div>

      {/* Crew */}
      <motion.div variants={item}>
        <p className="section-label mb-3">Crew members</p>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="card-surface rounded-2xl divide-y divide-slate-50">
            {(users ?? []).map((u) => (
              <div key={u.name} className="flex items-center gap-3 px-4 py-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${avatarColor(u.name)}`}
                >
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-0.5">
                    {u.hotel_room && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <BedDouble size={11} />
                        Kamer {u.hotel_room}
                      </span>
                    )}
                    {u.phone_number && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Phone size={11} />
                        {u.phone_number}
                      </span>
                    )}
                  </div>
                </div>
                {u.live_location_ping && (
                  <Badge variant="green" dot>
                    <MapPin size={10} />
                    {u.live_location_ping}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* App info */}
      <motion.div variants={item}>
        <div className="rounded-2xl border border-slate-100 bg-white/60 px-5 py-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl gradient-brand">
            <span className="text-sm font-black text-white">A</span>
          </div>
          <p className="font-black text-slate-800 text-sm">Ankerd Con</p>
          <p className="text-xs text-slate-400 mt-0.5">Crew portal · v1.0</p>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div variants={item}>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 py-3.5 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
        >
          <LogOut size={16} />
          Uitloggen
        </button>
      </motion.div>

      {/* Ping modal */}
      <Modal open={pingOpen} onClose={() => setPingOpen(false)} title="Locatie pingen" description="Stuur een snelle update naar de groep">
        <form onSubmit={handleSubmit(onPing)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Jouw naam</label>
            <input className="input-field" placeholder="Naam" {...register("user_name")} />
            {errors.user_name && <p className="mt-1.5 text-xs text-rose-500">{errors.user_name.message}</p>}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Locatie</label>
            <input className="input-field" placeholder="Bijv. Hal B, ingang links" {...register("ping_text")} />
            {errors.ping_text && <p className="mt-1.5 text-xs text-rose-500">{errors.ping_text.message}</p>}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            <MapPin size={16} />
            Pingen
          </Button>
        </form>
      </Modal>
    </motion.div>
  );
}
