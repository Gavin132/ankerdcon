import { useId, type ReactNode } from "react";
import { Switch } from "../../../components/common/Switch";

interface Props {
  icon: ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}

/** One setting in an admin sheet: icon, name, an optional hint and the on/off `Switch`. */
export function ToggleRow({ icon, label, hint, checked, onChange }: Props) {
  const labelId = useId();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-1.5 border-line bg-paper px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-ink-2">
          {icon}
          <span id={labelId} className="text-sm font-medium text-ink">{label}</span>
        </div>
        {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} labelledBy={labelId} />
    </div>
  );
}
