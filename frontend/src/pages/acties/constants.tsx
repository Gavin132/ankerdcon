import { Bus, UtensilsCrossed, CheckCircle2, ArrowUpRight } from "lucide-react";
import type { ActionKind } from "../../utils/actionItems";

export const PAGE_SIZE = 8;

export const KIND_CFG: Record<
  ActionKind,
  {
    bar: string;
    iconBg: string;
    icon: React.ReactNode;
    iconWhite: React.ReactNode;
    label: string;
    pill: string;
    barColor: string;
    heroColor: string;
  }
> = {
  event_gap: {
    bar: "from-amber-400 to-orange-400",
    iconBg: "bg-amber-100 dark:bg-amber-500/10",
    icon: <Bus size={13} className="text-amber-600 dark:text-amber-400" />,
    iconWhite: <Bus size={11} className="text-white/70" />,
    label: "Transport & Eten",
    pill: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    barColor: "bg-amber-400",
    heroColor: "bg-amber-500/20 border-amber-400/25",
  },
  restaurant_gap: {
    bar: "from-orange-400 to-rose-400",
    iconBg: "bg-orange-100 dark:bg-orange-500/10",
    icon: <UtensilsCrossed size={13} className="text-orange-600 dark:text-orange-400" />,
    iconWhite: <UtensilsCrossed size={11} className="text-white/70" />,
    label: "Restaurant",
    pill: "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
    barColor: "bg-orange-400",
    heroColor: "bg-orange-500/20 border-orange-400/25",
  },
  payment_due: {
    bar: "from-violet-400 to-purple-500",
    iconBg: "bg-violet-100 dark:bg-violet-500/10",
    icon: <ArrowUpRight size={13} className="text-violet-600 dark:text-violet-400" />,
    iconWhite: <ArrowUpRight size={11} className="text-white/70" />,
    label: "Te betalen",
    pill: "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
    barColor: "bg-violet-400",
    heroColor: "bg-violet-500/20 border-violet-400/25",
  },
  payment_confirm: {
    bar: "from-emerald-400 to-teal-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/10",
    icon: <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />,
    iconWhite: <CheckCircle2 size={11} className="text-white/70" />,
    label: "Te bevestigen",
    pill: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    barColor: "bg-emerald-400",
    heroColor: "bg-emerald-500/20 border-emerald-400/25",
  },
};
