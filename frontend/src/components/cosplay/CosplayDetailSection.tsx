import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Plus, X, Image, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../common/Button";
import { Drawer } from "../common/Drawer";
import { NamePicker } from "../common/NamePicker";
import { SectionLabel } from "../common/SectionLabel";
import { CosplayCard } from "./CosplayCard";
import { useCosplays, useCreateCosplay, useDeleteCosplay } from "../../hooks/useCosplays";
import { useUsers } from "../../hooks/useUsers";
import { toast } from "../../store/toast.store";
import { listContainer } from "../../utils/motion";
import { formatDate } from "../../utils/format";
import type { CalendarEvent, User } from "../../types";

// ── Form schema ───────────────────────────────────────────────────────────────

const cosplaySchema = z.object({
  character_name: z.string().min(1, "Karakter naam is verplicht"),
  series: z.string().optional(),
  notes: z.string().optional(),
});

type CosplayForm = z.infer<typeof cosplaySchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const SL = "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";
const SF = "space-y-4 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const ST = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CosplayDetailSectionProps {
  event: CalendarEvent;
  /** Sibling days sharing the same multi_day_id (empty for single-day events). */
  siblingEvents: CalendarEvent[];
  users: User[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CosplayDetailSection({ event, siblingEvents, users }: CosplayDetailSectionProps) {
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [selectedUser, setSelectedUser]     = useState("");
  const [selectedDays, setSelectedDays]     = useState<string[]>([event.id]);
  const [inspoImages, setInspoImages]       = useState<string[]>([""]);
  const [deleteId, setDeleteId]             = useState<string | null>(null);

  const { data: cosplays = [] } = useCosplays();
  const { data: allUsers = [] }  = useUsers();
  const createMutation           = useCreateCosplay();
  const deleteMutation           = useDeleteCosplay();

  const userNames = allUsers.map((u) => u.name);

  // All events relevant to this page (current + siblings)
  const allRelatedEvents = [event, ...siblingEvents].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const isMultiDay = siblingEvents.length > 0;

  // Filter cosplays that include any of the related event IDs
  const relatedEventIds = new Set(allRelatedEvents.map((e) => e.id));
  const eventCosplays = cosplays.filter((c) =>
    c.linked_event_ids.some((eid) => relatedEventIds.has(eid)),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CosplayForm>({
    resolver: zodResolver(cosplaySchema),
  });

  function openDrawer() {
    reset();
    setSelectedUser("");
    setSelectedDays([event.id]);
    setInspoImages([""]);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  // ── Image URL list helpers ────────────────────────────────────────────────

  function addImageField() {
    setInspoImages((prev) => [...prev, ""]);
  }

  function updateImage(index: number, value: string) {
    setInspoImages((prev) => prev.map((url, i) => (i === index ? value : url)));
  }

  function removeImage(index: number) {
    setInspoImages((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Day checkbox helpers ──────────────────────────────────────────────────

  function toggleDay(eventId: string) {
    setSelectedDays((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId],
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: CosplayForm) {
    if (!selectedUser) {
      toast("error", "Selecteer wie dit cosplay draagt.");
      return;
    }
    if (selectedDays.length === 0) {
      toast("error", "Selecteer minimaal één dag.");
      return;
    }

    const cleanImages = inspoImages.map((url) => url.trim()).filter(Boolean);

    try {
      await createMutation.mutateAsync({
        user_name: selectedUser,
        character_name: values.character_name,
        series: values.series || undefined,
        notes: values.notes || undefined,
        inspo_images: cleanImages,
        linked_event_ids: selectedDays,
      });
      closeDrawer();
      toast("success", `${values.character_name} toegevoegd!`);
    } catch {
      toast("error", "Kon cosplay niet opslaan. Probeer opnieuw.");
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function confirmDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteId(null);
      toast("success", "Cosplay verwijderd.");
    } catch {
      toast("error", "Verwijderen mislukt.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const footer = (
    <Button
      type="submit"
      form="cosplay-form"
      loading={isSubmitting || createMutation.isPending}
      className="w-full"
    >
      <Sparkles size={15} />
      Cosplay opslaan
    </Button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Cosplays</SectionLabel>
        <button
          onClick={openDrawer}
          className="flex items-center gap-1.5 rounded-xl border border-violet-200 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
        >
          <Plus size={12} />
          Toevoegen
        </button>
      </div>

      {eventCosplays.length === 0 ? (
        <div className="card-surface rounded-2xl px-5 py-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30">
            <Sparkles size={22} className="text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Nog geen cosplays gedeeld
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Laat anderen weten wat je draagt!
            </p>
          </div>
          <Button size="sm" onClick={openDrawer}>
            <Plus size={13} />
            Eerste cosplay toevoegen
          </Button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {eventCosplays.map((cosplay) => (
            <div key={cosplay.id} className="relative group/card">
              <CosplayCard
                cosplay={cosplay}
                events={allRelatedEvents}
                users={users}
              />
              {/* Delete button — shown on hover */}
              <button
                onClick={(e) => { e.preventDefault(); setDeleteId(cosplay.id); }}
                className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-rose-500 opacity-0 group-hover/card:opacity-100 transition-all"
                title="Verwijderen"
              >
                <Trash2 size={13} />
              </button>

              {/* Inline delete confirm */}
              <AnimatePresence>
                {deleteId === cosplay.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm"
                  >
                    <div className="text-center space-y-3 px-4">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Verwijderen?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(null)}
                        >
                          Annuleren
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deleteMutation.isPending}
                          onClick={() => confirmDelete(cosplay.id)}
                        >
                          Verwijderen
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Create drawer ── */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Cosplay toevoegen"
        subtitle="Laat zien wat je draagt!"
        footer={footer}
      >
        <form id="cosplay-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Persoon */}
          <div className={SF}>
            <p className={ST}>Wie draagt dit?</p>
            <NamePicker
              options={userNames}
              value={selectedUser}
              onChange={setSelectedUser}
              placeholder="Zoek naam…"
              color="sky"
            />
            {!selectedUser && (
              <p className="text-xs text-slate-400 mt-1">Selecteer de persoon die dit cosplay draagt.</p>
            )}
          </div>

          {/* Karakter */}
          <div className={SF}>
            <p className={ST}>Karakter</p>
            <div>
              <label className={SL}>Karakter naam</label>
              <input
                className="input-field"
                placeholder="Bijv. Luffy, Batman, Pikachu…"
                autoComplete="off"
                {...register("character_name")}
              />
              {errors.character_name && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.character_name.message}</p>
              )}
            </div>
            <div>
              <label className={SL}>Serie / film / game (optioneel)</label>
              <input
                className="input-field"
                placeholder="Bijv. One Piece, DC Comics…"
                autoComplete="off"
                {...register("series")}
              />
            </div>
          </div>

          {/* Dag selectie — alleen voor multi-day events */}
          {isMultiDay && (
            <div className={SF}>
              <p className={ST}>Welke dag(en)?</p>
              <div className="space-y-2">
                {allRelatedEvents.map((e) => (
                  <label
                    key={e.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                      selectedDays.includes(e.id)
                        ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-slate-200 dark:border-white/[0.08] hover:border-violet-300 dark:hover:border-violet-600/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-violet-500 shrink-0"
                      checked={selectedDays.includes(e.id)}
                      onChange={() => toggleDay(e.id)}
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(e.date)}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">{e.event_name}</span>
                  </label>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-rose-500">Selecteer minimaal één dag.</p>
              )}
            </div>
          )}

          {/* Inspiratie afbeeldingen */}
          <div className={SF}>
            <p className={ST}>Inspiratie afbeeldingen (optioneel)</p>
            <div className="space-y-2">
              {inspoImages.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Image size={14} className="text-slate-400 shrink-0" />
                  <input
                    className="input-field flex-1"
                    placeholder="https://i.imgur.com/… of Pinterest URL"
                    value={url}
                    onChange={(e) => updateImage(index, e.target.value)}
                  />
                  {inspoImages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addImageField}
              className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors mt-1"
            >
              <Plus size={12} />
              Afbeelding toevoegen
            </button>
          </div>

          {/* Notities */}
          <div className={SF}>
            <p className={ST}>Notities (optioneel)</p>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Extra info over je cosplay, progress updates…"
              {...register("notes")}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
