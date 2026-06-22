import { ArrowRight, ArrowLeft, UtensilsCrossed } from "lucide-react";

const CHIP_CONFIG: Record<string, { icon: React.ReactNode; cls: string }> = {
  Heen: {
    icon: <ArrowRight size={10} />,
    cls: "bg-sky-100 text-sky-700 border border-sky-200",
  },
  Terug: {
    icon: <ArrowLeft size={10} />,
    cls: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  },
  Eten: {
    icon: <UtensilsCrossed size={10} />,
    cls: "bg-amber-100 text-amber-700 border border-amber-200",
  },
};

export function MissingChip({ label }: { label: string }) {
  const cfg = CHIP_CONFIG[label] ?? {
    icon: null,
    cls: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.icon}
      {label}
    </span>
  );
}
