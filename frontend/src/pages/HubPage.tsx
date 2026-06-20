import { motion } from "framer-motion";
import {
  CalendarDays,
  Bus,
  UtensilsCrossed,
  Wallet,
  BedDouble,
  Users,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/common/Badge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { usePayments } from "../hooks/usePayments";
import { useUsers } from "../hooks/useUsers";
import { formatDate } from "../utils/format";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// Deterministic color per name initial
const AVATAR_COLORS = [
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-indigo-400 to-blue-600",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

interface StatCardProps {
  gradient: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  onClick?: () => void;
}

function StatCard({ gradient, icon, value, label, onClick }: StatCardProps) {
  return (
    <motion.button
      variants={item}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 text-left shadow-stat ${gradient} ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
      whileHover={onClick ? { y: -2, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
    >
      {/* Background glow */}
      <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            {icon}
          </div>
          {onClick && (
            <ArrowRight size={14} className="text-white/50 group-hover:text-white/80 transition-colors" />
          )}
        </div>
        <div className="text-3xl font-black text-white leading-none">{value}</div>
        <div className="mt-1 text-xs font-semibold text-white/70 uppercase tracking-widest">
          {label}
        </div>
      </div>
    </motion.button>
  );
}

export function HubPage() {
  const navigate = useNavigate();
  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: payments } = usePayments();
  const { data: users } = useUsers();

  if (evLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalSpend = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const event = events?.[0];

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Hero event card */}
      <motion.div variants={item}>
        {event ? (
          <div className="relative overflow-hidden rounded-3xl gradient-hero shadow-hero">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-400/10" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute top-4 right-4 h-64 w-64 rounded-full bg-sky-600/10 blur-2xl" />

            <div className="relative p-6">
              {/* Event badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-400/20 px-3 py-1.5 backdrop-blur-sm border border-sky-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-xs font-bold text-sky-300 uppercase tracking-widest">
                  Aankomend evenement
                </span>
              </div>

              <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                {event.event_name}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-sky-200">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-sky-400" />
                  {formatDate(event.date)}
                </span>
                {event.is_hotel && (
                  <span className="flex items-center gap-1.5">
                    <BedDouble size={14} className="text-sky-400" />
                    Hotel inbegrepen
                  </span>
                )}
              </div>

              {event.participants.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {event.participants.slice(0, 5).map((p) => (
                      <div
                        key={p}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0F3D5A] bg-gradient-to-br ${avatarColor(p)} text-xs font-bold text-white`}
                        title={p}
                      >
                        {p[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-sky-300">
                    {event.participants.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl gradient-hero shadow-hero p-6">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-400/10" />
            <div className="relative">
              <div className="mb-2 text-sky-400/60 text-sm font-semibold uppercase tracking-widest">
                Welkom
              </div>
              <h2 className="text-2xl font-black text-white">Ankerd Con Portal</h2>
              <p className="mt-2 text-sm text-sky-300/80">
                Verbinding maken met de spreadsheet...
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats grid */}
      <div>
        <p className="section-label mb-3">Overzicht</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            gradient="gradient-card-blue"
            icon={<Bus size={18} className="text-white" />}
            value={(rides ?? []).length}
            label="Ritten"
            onClick={() => navigate("/transport")}
          />
          <StatCard
            gradient="gradient-card-amber"
            icon={<UtensilsCrossed size={18} className="text-white" />}
            value={(meals ?? []).length}
            label="Maaltijden"
            onClick={() => navigate("/food")}
          />
          <StatCard
            gradient="gradient-card-green"
            icon={<Wallet size={18} className="text-white" />}
            value={`€${totalSpend.toFixed(0)}`}
            label="Uitgaven"
            onClick={() => navigate("/finance")}
          />
          <StatCard
            gradient="gradient-card-violet"
            icon={<Users size={18} className="text-white" />}
            value={(users ?? []).length}
            label="Crew"
          />
        </div>
      </div>

      {/* Crew roster */}
      {(users ?? []).length > 0 && (
        <motion.div variants={item}>
          <p className="section-label mb-3">Crew</p>
          <div className="card-surface rounded-2xl divide-y divide-slate-50">
            {(users ?? []).map((u) => (
              <div key={u.name} className="flex items-center gap-3 px-4 py-3.5">
                <div
                  className={`avatar h-10 w-10 rounded-xl bg-gradient-to-br text-sm ${avatarColor(u.name)} shadow-sm`}
                >
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{u.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {u.hotel_room && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <BedDouble size={11} />
                        Kamer {u.hotel_room}
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
        </motion.div>
      )}
    </motion.div>
  );
}
