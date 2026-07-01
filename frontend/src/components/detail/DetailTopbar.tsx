import { ArrowLeft } from "lucide-react";

interface DetailTopbarProps {
  title: string;
  onBack: () => void;
}

export function DetailTopbar({ title, onBack }: DetailTopbarProps) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4
                 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md
                 border-b border-slate-200 dark:border-white/[0.06]"
    >
      <button
        onClick={onBack}
        className="flex h-8 w-8 items-center justify-center rounded-xl
                   text-slate-500 dark:text-slate-400
                   hover:bg-slate-100 dark:hover:bg-white/[0.08]
                   hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
      </button>
      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
        {title}
      </span>
    </div>
  );
}
