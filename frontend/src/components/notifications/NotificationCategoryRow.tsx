import { useId } from "react";
import { Switch } from "../common/Switch";

interface Props {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

/** One kind of notification: what it is and the on/off switch. The same row on the Meldingen page and in onboarding. */
export function NotificationCategoryRow({ label, description, checked, onChange }: Props) {
  const labelId = useId();
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p id={labelId} className="text-[14px] font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-3">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} labelledBy={labelId} />
    </div>
  );
}
