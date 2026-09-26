import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Calendar, ImageOff, ExternalLink, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../common/Button";
import { UserAvatar } from "../common/UserAvatar";
import { useActingPermissions } from "../../hooks/useUsers";
import { formatDate } from "../../utils/format";
import { safeHref } from "../../utils/validation";
import { routes } from "../../config/routes";
import type { Cosplay, CalendarEvent, User } from "../../types";

/**
 * One cosplay in full. Like the filter, this is a *view of the cosplay sheet*
 * (with a back arrow to the list) rather than an overlay of its own: the sheet
 * supplies the header, so this is only the body and the delete footer.
 */
interface CosplayDetailBodyProps {
  cosplay: Cosplay;
  events: CalendarEvent[];
  users: User[];
  /** Leaves the sheet, e.g. when following a link to a day's page. */
  onLeave: () => void;
}

export function CosplayDetailBody({ cosplay, events, users, onLeave: onClose }: CosplayDetailBodyProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const user = users.find(
    (u) => u.name === cosplay.user_name || u.discord_username === cosplay.user_name,
  );

  const linkedEvents = cosplay.linked_event_ids
    .map((eid) => events.find((e) => e.id === eid))
    .filter((e): e is CalendarEvent => e !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
    <div className="space-y-6">

      {/* ── User + day chips ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border-1.5 border-line bg-surface py-1 pl-1.5 pr-3">
          <UserAvatar
            name={user?.name ?? cosplay.user_name}
            user={user}
            className="h-5 w-5 text-[8px]"
          />
          <span className="text-xs font-semibold text-ink">
            {user?.name ?? cosplay.user_name}
          </span>
        </div>

        {linkedEvents.map((e) => (
          <Link
            key={e.id}
            to={routes.event.view(e.id)}
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-full border-1.5 border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
          >
            <Calendar size={11} />
            {formatDate(e.date)}
          </Link>
        ))}
      </div>

      {/* ── Inspiratie afbeeldingen ── */}
      {cosplay.inspo_images.length > 0 && (
        <div>
          <p className="section-label mb-3">
            Inspiratie
          </p>
          <div className={`grid gap-2 ${
            cosplay.inspo_images.length === 1
              ? "grid-cols-1"
              : cosplay.inspo_images.length === 2
              ? "grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3"
          }`}>
            {cosplay.inspo_images.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(url)}
                className="group relative aspect-square overflow-hidden rounded-xl border-1.5 border-line bg-sunken transition-colors hover:border-ink-3"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink-3">
                  <ImageOff size={18} />
                  <span className="text-[10px]">Niet beschikbaar</span>
                </div>
                <img
                  src={url}
                  alt={`Inspiratie ${i + 1}`}
                  className="relative h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={safeHref(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F1519]/70 text-[#E6F0F3] hover:bg-[#0F1519]/90"
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {cosplay.inspo_images.length === 0 && (
        <div className="flex flex-col items-center gap-2.5 rounded-xl border-1.5 border-dashed border-line py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
            <Sparkles size={22} />
          </div>
          <p className="text-xs text-ink-3">Geen inspiratieafbeeldingen</p>
        </div>
      )}

      {/* ── Notes ── */}
      {cosplay.notes && (
        <div className="rounded-xl border-1.5 border-line bg-sunken px-4 py-4">
          <p className="section-label mb-2">
            Notities
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {cosplay.notes}
          </p>
        </div>
      )}
    </div>

    {/* Lightbox — rendered above the drawer (z-[500]) */}
    {lightbox && createPortal(
      <AnimatePresence>
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt="Inspiratie"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      </AnimatePresence>,
      document.body,
    )}
    </>
  );
}

/** The delete button, shown only to the cosplayer themselves (or an admin). Returns null for anyone else. */
export function CosplayDetailFooter({
  cosplay,
  onDelete,
  deleteLoading,
}: {
  cosplay: Cosplay;
  onDelete: (id: string) => void;
  deleteLoading?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { canActFor } = useActingPermissions();

  if (!canActFor(cosplay.user_name)) return null;

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(cosplay.id);
    setConfirmDelete(false);
  }

  return confirmDelete ? (
    <div className="flex items-center gap-2">
      <p className="flex-1 text-xs font-semibold text-ink">Zeker verwijderen?</p>
      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
        Annuleer
      </Button>
      <Button size="sm" variant="danger" loading={deleteLoading} onClick={handleDelete}>
        Verwijderen
      </Button>
    </div>
  ) : (
    <Button variant="ghost" className="w-full text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" onClick={handleDelete}>
      <Trash2 size={14} />
      Cosplay verwijderen
    </Button>
  );
}
