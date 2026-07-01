import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Calendar, ImageOff, ExternalLink, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "../common/Drawer";
import { Button } from "../common/Button";
import { UserAvatar } from "../common/UserAvatar";
import { formatDate } from "../../utils/format";
import { routes } from "../../config/routes";
import type { Cosplay, CalendarEvent, User } from "../../types";

interface CosplayDetailDrawerProps {
  cosplay: Cosplay | null;
  events: CalendarEvent[];
  users: User[];
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleteLoading?: boolean;
}

export function CosplayDetailDrawer({
  cosplay,
  events,
  users,
  open,
  onClose,
  onDelete,
  deleteLoading,
}: CosplayDetailDrawerProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!cosplay) return null;

  const user = users.find(
    (u) => u.name === cosplay.user_name || u.discord_username === cosplay.user_name,
  );

  const linkedEvents = cosplay.linked_event_ids
    .map((eid) => events.find((e) => e.id === eid))
    .filter((e): e is CalendarEvent => e !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(cosplay!.id);
    setConfirmDelete(false);
  }

  const footer = (
    <div className="space-y-2">
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Zeker verwijderen?
          </p>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
            Annuleer
          </Button>
          <Button size="sm" variant="danger" loading={deleteLoading} onClick={handleDelete}>
            Verwijderen
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className="w-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={handleDelete}>
          <Trash2 size={14} />
          Cosplay verwijderen
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        open={open}
        onClose={() => { onClose(); setConfirmDelete(false); }}
        title={cosplay.character_name}
        subtitle={cosplay.series ?? undefined}
        footer={footer}
      >
        <div className="space-y-6">

          {/* ── User + day chips ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5">
              <UserAvatar
                name={user?.name ?? cosplay.user_name}
                user={user}
                className="h-5 w-5 text-[8px]"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {user?.name ?? cosplay.user_name}
              </span>
            </div>

            {linkedEvents.map((e) => (
              <Link
                key={e.id}
                to={routes.event.view(e.id)}
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
              >
                <Calendar size={11} />
                {formatDate(e.date)}
              </Link>
            ))}
          </div>

          {/* ── Inspiratie afbeeldingen ── */}
          {cosplay.inspo_images.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
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
                    className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 hover:opacity-90 active:scale-95 transition-all group"
                  >
                    <img
                      src={url}
                      alt={`Inspiratie ${i + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-600">
                      <ImageOff size={18} />
                      <span className="text-[10px]">Niet beschikbaar</span>
                    </div>
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70"
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
            <div className="flex flex-col items-center gap-2 py-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
              <Sparkles size={22} className="opacity-40" />
              <p className="text-xs">Geen inspiratieafbeeldingen</p>
            </div>
          )}

          {/* ── Notes ── */}
          {cosplay.notes && (
            <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.07] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Notities
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {cosplay.notes}
              </p>
            </div>
          )}
        </div>
      </Drawer>

      {/* Lightbox — rendered above the drawer (z-[500]) */}
      {lightbox && createPortal(
        <AnimatePresence>
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4"
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
