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

// Flat form sections separated by a divider; labels follow the design system.
const SL = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";
const SF = "space-y-3 border-t-1.5 border-line pt-5 first:border-t-0 first:pt-0";
const ST = "section-label";

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
          className="flex items-center gap-1.5 rounded-xl border-1.5 border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink-3"
        >
          <Plus size={12} />
          Toevoegen
        </button>
      </div>

      {eventCosplays.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-5 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              Nog geen cosplays gedeeld
            </p>
            <p className="mt-1 text-xs text-ink-3">
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
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
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
                onClick={() => {}}
              />
              {/* Delete button — shown on hover */}
              <button
                onClick={(e) => { e.preventDefault(); setDeleteId(cosplay.id); }}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border-1.5 border-line bg-surface text-ink-3 opacity-0 transition-opacity hover:text-rose-600 group-hover/card:opacity-100 dark:hover:text-rose-400"
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
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-[12px] border-1.5 border-line bg-surface"
                  >
                    <div className="text-center space-y-3 px-4">
                      <p className="text-sm font-semibold text-ink">
                        Verwijderen?
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
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
              <p className="mt-1 text-xs text-ink-3">Selecteer de persoon die dit cosplay draagt.</p>
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
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.character_name.message}</p>
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
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-1.5 px-3 py-2.5 transition-colors ${
                      selectedDays.includes(e.id)
                        ? "border-ink bg-sunken"
                        : "border-line bg-surface hover:border-ink-3"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="cb"
                      checked={selectedDays.includes(e.id)}
                      onChange={() => toggleDay(e.id)}
                    />
                    <span className="text-sm font-semibold text-ink">
                      {formatDate(e.date)}
                    </span>
                    <span className="ml-auto truncate text-xs text-ink-3">{e.event_name}</span>
                  </label>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-rose-600 dark:text-rose-400">Selecteer minimaal één dag.</p>
              )}
            </div>
          )}

          {/* Inspiratie afbeeldingen */}
          <div className={SF}>
            <p className={ST}>Inspiratie afbeeldingen (optioneel)</p>
            <div className="space-y-2">
              {inspoImages.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Image size={14} className="shrink-0 text-ink-3" />
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
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
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
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-text hover:underline"
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
