import { useState } from "react";
import { ArrowDown } from "lucide-react";
import { useAdminMergePreview, useAdminMergeUser } from "../../../hooks/useAdmin";
import { ApiError } from "../../../lib/api/client";
import { Button } from "../../../components/common/Button";
import { NamePicker } from "../../../components/common/NamePicker";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { toast } from "../../../store/toast.store";
import { droppedParts, movedParts } from "../../../utils/mergePreview";
import type { User } from "../../../types";
import { AdminDrawer } from "../AdminDrawer";
import { L } from "../styles";

interface Props {
  /** The placeholder to fold away; null keeps the sheet closed. */
  source: User | null;
  users: User[];
  onClose: () => void;
}

/** "Een, twee en drie". */
function joinNl(parts: string[]): string {
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} en ${parts[parts.length - 1]}`;
}

/**
 * Admin › Gebruikers › "Voeg samen met…": pick the real member a placeholder profile stands for, read what
 * would move (the preview is asked from the server, nothing changes yet) and confirm. The server decides
 * everything; this only shows it.
 */
export function UserMergeSheet({ source, users, onClose }: Props) {
  const [targetName, setTargetName] = useState("");
  const mergeMutation = useAdminMergeUser();

  // Only members who have logged in: a placeholder cannot be the target, and a deactivated member is refused too.
  const options = users
    .filter((u) => u.id && u.id !== source?.id && !u.is_placeholder && u.is_active !== false)
    .map((u) => u.name)
    .sort((a, b) => a.localeCompare(b, "nl"));
  const target = users.find((u) => u.name === targetName && !u.is_placeholder);

  const preview = useAdminMergePreview(source?.id, target?.id);
  const result = preview.data;
  const moved = result ? movedParts(result) : [];
  const dropped = result ? droppedParts(result) : [];
  const previewError = preview.error instanceof ApiError ? preview.error.message : preview.error ? "Kon niet bekijken wat er verplaatst wordt. Probeer het opnieuw." : null;

  async function confirm() {
    if (!source?.id || !target?.id) return;
    try {
      await mergeMutation.mutateAsync({ sourceId: source.id, targetId: target.id });
      toast("success", `${source.name} is samengevoegd met ${target.name}.`);
      onClose();
    } catch (err) {
      toast("error", err instanceof ApiError && err.message ? err.message : "Kon niet samenvoegen. Probeer het opnieuw.");
    }
  }

  const ready = !!result && !preview.isFetching;

  return (
    <AdminDrawer
      open={!!source}
      onClose={onClose}
      title="Voeg samen met…"
      subtitle={source ? `${source.name} · placeholder` : undefined}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
            Annuleren
          </Button>
          <Button variant="danger" type="button" onClick={confirm} loading={mergeMutation.isPending} disabled={!ready} className="flex-1">
            Samenvoegen
          </Button>
        </div>
      }
    >
      {source && (
        <div className="space-y-5">
          <p className="text-sm text-ink-2">
            {source.name} is een placeholder: een profiel dat een admin maakte voordat iemand had ingelogd. Kies het lid dat
            hierachter zit. Alles waar {source.name} op staat gaat naar dat lid.
          </p>

          <div className="flex items-center gap-3 rounded-xl border-1.5 border-line px-3 py-2.5">
            <UserAvatar name={source.name} className="h-8 w-8 text-[10px] shrink-0" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{source.name}</p>
            <ArrowDown size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
          </div>

          <div>
            <label className={L}>Samenvoegen met</label>
            <NamePicker
              options={options}
              value={targetName}
              onChange={setTargetName}
              color="sky"
              placeholder="Zoek een lid dat al is ingelogd…"
            />
          </div>

          {target && preview.isLoading && (
            <div className="space-y-2" aria-busy="true">
              <div className="h-4 w-3/4 animate-pulse rounded bg-sunken" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-sunken" />
            </div>
          )}

          {target && previewError && (
            <div role="alert" className="notice-bad p-4 text-sm text-ink">
              {previewError}
            </div>
          )}

          {target && result && (
            <div className="space-y-3 text-sm text-ink">
              <p>
                {moved.length > 0 ? (
                  <>
                    <span className="font-semibold">Dit verplaatst:</span> {joinNl(moved)}.
                  </>
                ) : (
                  <>Er staat niets op {source.name}. Alleen het profiel verdwijnt.</>
                )}
              </p>
              {dropped.length > 0 && (
                <p className="text-ink-2">
                  <span className="font-semibold">Niet overgenomen:</span> {joinNl(dropped)}.
                </p>
              )}
              <p>
                {result.alias_names.length > 0 ? (
                  <>
                    De {result.alias_names.length === 1 ? "naam" : "namen"} ‘{result.alias_names.join("’, ‘")}’ wordt een bijnaam van{" "}
                    {target.name}
                  </>
                ) : (
                  <>Alle namen van {source.name} zijn al van {target.name}</>
                )}{" "}
                en het placeholder-profiel wordt verwijderd. Dit kun je niet ongedaan maken.
              </p>
            </div>
          )}
        </div>
      )}
    </AdminDrawer>
  );
}
