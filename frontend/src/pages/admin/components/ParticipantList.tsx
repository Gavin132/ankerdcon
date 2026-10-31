import { UserX } from "lucide-react";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { SECTION, SECTION_TITLE } from "../styles";

interface Props {
  participants: string[];
  onRemove: (name: string) => void;
  isPending: boolean;
  label?: string;
}

export function ParticipantList({
  participants,
  onRemove,
  isPending,
  label = "Deelnemers",
}: Props) {
  if (participants.length === 0) return null;

  return (
    <div className={SECTION}>
      <p className={SECTION_TITLE}>
        {label} ({participants.length})
      </p>
      <div className="space-y-1.5">
        {participants.map((p) => (
          <div
            key={p}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-paper py-0.5 pl-3 pr-1.5"
          >
            <UserAvatar name={p} className="h-6 w-6 text-[8px]" />
            <span className="flex-1 text-sm text-ink">{p}</span>
            <button
              type="button"
              onClick={() => onRemove(p)}
              disabled={isPending}
              aria-label={`${p} verwijderen`}
              title="Verwijderen"
              className="icon-btn text-ink-3 hover:!bg-bad-soft hover:!text-bad"
            >
              <UserX size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
