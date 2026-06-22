import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CollapsibleSectionProps } from "../../types/interfaces";

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className = "",
  titleClassName = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 ${titleClassName}`}
      >
        <span className="flex-1 text-left">{title}</span>
        {open ? (
          <ChevronUp size={14} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-slate-400" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
