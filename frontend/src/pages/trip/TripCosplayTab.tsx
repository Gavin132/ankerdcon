import { useState, useEffect, useMemo } from "react";
import {
  Sparkles, Plus, Image, Upload, X,
  CheckCircle2, SlidersHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCosplays, useCreateCosplay, useDeleteCosplay } from "../../hooks/useCosplays";
import { useUsers } from "../../hooks/useUsers";
import { CosplayCard } from "../../components/cosplay/CosplayCard";
import { CosplayDetailDrawer } from "../../components/cosplay/CosplayDetailDrawer";
import {
  CosplayFilterDrawer,
  DEFAULT_COSPLAY_FILTERS,
  cosplayActiveFilterCount,
  SORT_LABELS,
  type CosplayFilterState,
} from "../../components/cosplay/CosplayFilterDrawer";
import { Drawer } from "../../components/common/Drawer";
import { Button } from "../../components/common/Button";
import { NamePicker } from "../../components/common/NamePicker";
import { uploadCosplayImage } from "../../services/storage.service";
import { toast } from "../../store/toast.store";
import { formatDate } from "../../utils/format";
import { listContainer, listItem } from "../../utils/motion";
import { useTrip } from "./tripContext";
import type { Cosplay } from "../../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

// ── Form ──────────────────────────────────────────────────────────────────────

const schema = z.object({
  character_name: z.string().min(1, "Karakter naam is verplicht"),
  series: z.string().optional(),
  notes: z.string().optional(),
});
type CosplayForm = z.infer<typeof schema>;

interface ImageEntry {
  mode: "url" | "file";
  url: string;
  uploading: boolean;
}

// Flat form sections separated by a divider; labels follow the design system.
const SF = "space-y-3 border-t-1.5 border-line pt-5 first:border-t-0 first:pt-0";
const ST = "section-label";
const SL = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";

// ── Page ──────────────────────────────────────────────────────────────────────

/** Event › Cosplay: every cosplay planned for any day of the trip. */
export function TripCosplayTab() {
  const { trip, dayId } = useTrip();
  const firstConDay = trip.days.find((d) => d.ev.has_con !== false) ?? trip.days[0];
  const id = dayId ?? firstConDay.ev.id;

  const { data: cosplays = [], isLoading } = useCosplays();
  const { data: users = [] }              = useUsers();

  const createMutation = useCreateCosplay();
  const deleteMutation = useDeleteCosplay();

  const event = trip.days.find((d) => d.ev.id === id)?.ev;
  const allRelatedEvents = trip.days.map((d) => d.ev);
  const isMultiDay = trip.days.length > 1;

  const relatedIds = new Set(allRelatedEvents.map((e) => e.id));
  const eventCosplays = cosplays.filter((c) =>
    c.linked_event_ids.some((eid) => relatedIds.has(eid)),
  );

  const userNames       = users.map((u) => u.name);
  const cosplayerNames  = [...new Set(eventCosplays.map((c) => c.user_name))];

  // ── Filter & sort ─────────────────────────────────────────────────────────

  const [filters, setFilters]     = useState<CosplayFilterState>(DEFAULT_COSPLAY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage]            = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [filters]);

  const filtered = useMemo(() => {
    let result = [...eventCosplays];

    if (filters.persons.length > 0) {
      result = result.filter((c) => filters.persons.includes(c.user_name));
    }
    if (filters.days.length > 0) {
      result = result.filter((c) =>
        c.linked_event_ids.some((eid) => filters.days.includes(eid)),
      );
    }

    switch (filters.sort) {
      case "oldest":
        result.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "az":
        result.sort((a, b) => a.character_name.localeCompare(b.character_name));
        break;
      case "za":
        result.sort((a, b) => b.character_name.localeCompare(a.character_name));
        break;
      default: // newest
        result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    return result;
  }, [eventCosplays, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount = cosplayActiveFilterCount(filters);

  function removePersonFilter(name: string) {
    setFilters((f) => ({ ...f, persons: f.persons.filter((p) => p !== name) }));
  }
  function removeDayFilter() {
    setFilters((f) => ({ ...f, days: [] }));
  }
  function removeSortFilter() {
    setFilters((f) => ({ ...f, sort: "newest" }));
  }

  // ── Create drawer ─────────────────────────────────────────────────────────

  const [createOpen, setCreateOpen]  = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(id ? [id] : []);
  const [images, setImages]           = useState<ImageEntry[]>([{ mode: "url", url: "", uploading: false }]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CosplayForm>({ resolver: zodResolver(schema) });

  function openCreate() {
    reset();
    setSelectedUser("");
    setSelectedDays(id ? [id] : []);
    setImages([{ mode: "url", url: "", uploading: false }]);
    setCreateOpen(true);
  }

  function toggleDay(eid: string) {
    setSelectedDays((prev) =>
      prev.includes(eid) ? prev.filter((d) => d !== eid) : [...prev, eid],
    );
  }

  function setImageField(index: number, patch: Partial<ImageEntry>) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }
  function addImage() {
    setImages((prev) => [...prev, { mode: "url", url: "", uploading: false }]);
  }
  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileChange(index: number, file: File) {
    setImageField(index, { uploading: true });
    try {
      const url = await uploadCosplayImage(file);
      setImageField(index, { url, uploading: false });
    } catch {
      toast("error", "Upload mislukt. Probeer een URL in te voeren.");
      setImageField(index, { uploading: false });
    }
  }

  async function onSubmit(values: CosplayForm) {
    if (!selectedUser) { toast("error", "Selecteer wie dit cosplay draagt."); return; }
    if (selectedDays.length === 0) { toast("error", "Selecteer minimaal één dag."); return; }
    const cleanImages = images.map((img) => img.url.trim()).filter(Boolean);
    try {
      await createMutation.mutateAsync({
        user_name: selectedUser,
        character_name: values.character_name,
        series: values.series || undefined,
        notes: values.notes || undefined,
        inspo_images: cleanImages,
        linked_event_ids: selectedDays,
      });
      setCreateOpen(false);
      toast("success", `${values.character_name} toegevoegd!`);
    } catch {
      toast("error", "Kon cosplay niet opslaan. Probeer opnieuw.");
    }
  }

  // ── Detail drawer ─────────────────────────────────────────────────────────

  const [detailCosplay, setDetailCosplay] = useState<Cosplay | null>(null);

  async function handleDelete(cosplayId: string) {
    try {
      await deleteMutation.mutateAsync(cosplayId);
      setDetailCosplay(null);
      toast("success", "Cosplay verwijderd.");
    } catch {
      toast("error", "Verwijderen mislukt.");
    }
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
          <Sparkles size={22} />
        </div>
        <p className="text-sm font-semibold text-ink">Deze dag bestaat niet meer</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const createFooter = (
    <Button
      type="submit"
      form="cosplay-create-form"
      loading={isSubmitting || createMutation.isPending}
      className="w-full"
    >
      <Sparkles size={15} />
      Cosplay opslaan
    </Button>
  );

  const isFiltered = activeFilterCount > 0;

  const removableChip =
    "inline-flex items-center gap-1.5 rounded-full border-1.5 border-line bg-surface py-1 pl-2.5 pr-1 text-[11.5px] font-semibold text-ink-2";
  const removeChipButton =
    "flex h-5 w-5 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink";
  const pageArrow =
    "flex h-8 w-8 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line";

  return (
    <div className="pb-10">
      {/* ── Content ────────────────────────────────────────────────── */}
      <div>

        {/* Filter toolbar */}
        {!isLoading && eventCosplays.length > 0 && (
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-3">
              {/* Filter trigger */}
              <button
                onClick={() => setFilterOpen(true)}
                className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  activeFilterCount > 0
                    ? "border-1.5 border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                    : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
                }`}
              >
                <SlidersHorizontal size={13} />
                Filter & Sorteren
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-paper font-mono text-[9.5px] font-semibold text-ink">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Result count */}
              <span className="ml-auto truncate font-mono text-[11px] uppercase tracking-[0.05em] text-ink-3 tabular-nums">
                {isFiltered
                  ? `${filtered.length} van ${eventCosplays.length} cosplays`
                  : `${eventCosplays.length} ${eventCosplays.length === 1 ? "cosplay" : "cosplays"}`}
              </span>

              <button
                onClick={openCreate}
                className="btn-primary shrink-0 px-3 py-2 text-xs"
              >
                <Plus size={14} />
                Toevoegen
              </button>
            </div>

            {/* Active filter chips */}
            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 overflow-hidden"
                >
                  {filters.persons.map((name) => (
                    <span key={name} className={removableChip}>
                      {name}
                      <button onClick={() => removePersonFilter(name)} className={removeChipButton}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {filters.days.length > 0 && (
                    <span className={removableChip}>
                      {filters.days.length} {filters.days.length === 1 ? "dag" : "dagen"}
                      <button onClick={removeDayFilter} className={removeChipButton}>
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {filters.sort !== "newest" && (
                    <span className={removableChip}>
                      {SORT_LABELS[filters.sort]}
                      <button onClick={removeSortFilter} className={removeChipButton}>
                        <X size={11} />
                      </button>
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface overflow-hidden animate-pulse">
                <div className="aspect-[4/3] w-full border-b-1.5 border-line bg-sunken" />
                <div className="space-y-2.5 p-3">
                  <div className="h-4 w-3/4 rounded bg-sunken" />
                  <div className="h-3 w-1/2 rounded bg-sunken" />
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-sunken" />
                    <div className="h-3 w-16 rounded bg-sunken" />
                  </div>
                  <div className="h-4 w-20 rounded-md bg-sunken" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state (no cosplays at all) ── */}
        {!isLoading && eventCosplays.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                Nog geen cosplays gedeeld
              </p>
              <p className="mt-1 text-xs text-ink-3">Laat anderen weten wat je draagt!</p>
            </div>
            <button
              onClick={openCreate}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              <Plus size={16} />
              Eerste cosplay toevoegen
            </button>
          </div>
        )}

        {/* ── Filtered empty state ── */}
        {!isLoading && eventCosplays.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
              <SlidersHorizontal size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                Geen cosplays gevonden
              </p>
              <p className="mt-1 text-xs text-ink-3">Pas je filters aan of wis ze.</p>
            </div>
            <button
              onClick={() => setFilters(DEFAULT_COSPLAY_FILTERS)}
              className="text-[12.5px] font-semibold text-brand-text hover:underline"
            >
              Filters wissen
            </button>
          </div>
        )}

        {/* ── Grid ── */}
        {!isLoading && paginated.length > 0 && (
          <motion.div
            className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence mode="popLayout">
              {paginated.map((cosplay) => (
                <CosplayCard
                  key={cosplay.id}
                  cosplay={cosplay}
                  events={allRelatedEvents}
                  users={users}
                  onClick={() => setDetailCosplay(cosplay)}
                />
              ))}

              {/* Add cosplay card — shown on last page or when no filters active */}
              {(!isFiltered || page === totalPages) && (
                <motion.button
                  key="add-card"
                  variants={listItem}
                  type="button"
                  onClick={openCreate}
                  className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[12px] border-1.5 border-dashed border-line py-10 text-ink-3 transition-colors hover:border-ink-3 hover:text-ink"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sunken">
                    <Plus size={16} />
                  </div>
                  <span className="text-xs font-semibold">Cosplay toevoegen</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Pagination ── */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={pageArrow}
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const active = page === p;
              // Show first, last, current and ±1 around current; rest as ellipsis
              const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
              const showEllipsisBefore = p === page - 2 && page > 3;
              const showEllipsisAfter  = p === page + 2 && page < totalPages - 2;
              if (showEllipsisBefore || showEllipsisAfter) {
                return (
                  <span key={p} className="w-8 text-center text-xs text-ink-3">…</span>
                );
              }
              if (!show) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 min-w-[2rem] rounded-xl px-2 font-mono text-xs font-semibold tabular-nums transition-colors ${
                    active
                      ? "border-1.5 border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                      : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={pageArrow}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ── Create drawer ──────────────────────────────────────────── */}
      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Cosplay toevoegen"
        subtitle="Laat zien wat je draagt!"
        footer={createFooter}
      >
        <form id="cosplay-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          <div className={SF}>
            <p className={ST}>Wie draagt dit?</p>
            <NamePicker options={userNames} value={selectedUser} onChange={setSelectedUser} placeholder="Zoek naam…" color="sky" />
            {!selectedUser && <p className="mt-1 text-xs text-ink-3">Selecteer de persoon die dit cosplay draagt.</p>}
          </div>

          <div className={SF}>
            <p className={ST}>Karakter</p>
            <div>
              <label className={SL}>Karakter naam *</label>
              <input className="input-field" placeholder="Bijv. Luffy, Batman, Pikachu…" autoComplete="off" {...register("character_name")} />
              {errors.character_name && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.character_name.message}</p>}
            </div>
            <div>
              <label className={SL}>Serie / film / game (optioneel)</label>
              <input className="input-field" placeholder="Bijv. One Piece, DC Comics…" autoComplete="off" {...register("series")} />
            </div>
          </div>

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
                    <input type="checkbox" className="cb" checked={selectedDays.includes(e.id)} onChange={() => toggleDay(e.id)} />
                    <span className="text-sm font-semibold text-ink">{formatDate(e.date)}</span>
                    <span className="ml-auto truncate text-xs text-ink-3">{e.event_name}</span>
                  </label>
                ))}
              </div>
              {selectedDays.length === 0 && <p className="text-xs text-rose-600 dark:text-rose-400">Selecteer minimaal één dag.</p>}
            </div>
          )}

          <div className={SF}>
            <p className={ST}>Inspiratie afbeeldingen (optioneel)</p>
            <div className="space-y-3">
              {images.map((entry, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="inline-flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]">
                    {(["url", "file"] as const).map((m) => (
                      <button
                        key={m} type="button" onClick={() => setImageField(index, { mode: m })}
                        aria-pressed={entry.mode === m}
                        className={`rounded-[7px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                          entry.mode === m
                            ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]"
                            : "text-ink-2 hover:text-ink"
                        }`}
                      >
                        {m === "url" ? "Link" : "Bestand"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.mode === "url" ? (
                      <>
                        <Image size={14} className="shrink-0 text-ink-3" />
                        <input
                          className="input-field flex-1"
                          placeholder="https://i.imgur.com/… of Pinterest URL"
                          value={entry.url}
                          onChange={(e) => setImageField(index, { url: e.target.value })}
                        />
                      </>
                    ) : (
                      <label className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl border-1.5 px-3 py-2.5 transition-colors ${
                        entry.url
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                          : "border-line bg-surface hover:border-ink-3"
                      }`}>
                        {entry.uploading
                          ? <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-ink-3 border-t-transparent" />
                          : entry.url
                          ? <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                          : <Upload size={14} className="shrink-0 text-ink-3" />}
                        <span className={`truncate text-xs font-medium ${entry.url ? "text-emerald-700 dark:text-emerald-300" : "text-ink-2"}`}>
                          {entry.uploading ? "Uploaden…" : entry.url ? "Geüpload" : "Kies afbeelding…"}
                        </span>
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(index, f); }} />
                      </label>
                    )}
                    {images.length > 1 && (
                      <button type="button" onClick={() => removeImage(index)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addImage} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-text hover:underline">
              <Plus size={12} />
              Afbeelding toevoegen
            </button>
          </div>

          <div className={SF}>
            <p className={ST}>Notities (optioneel)</p>
            <textarea className="input-field resize-none" rows={3} placeholder="Extra info over je cosplay, progress updates…" {...register("notes")} />
          </div>
        </form>
      </Drawer>

      {/* ── Filter drawer ──────────────────────────────────────────── */}
      <CosplayFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_COSPLAY_FILTERS)}
        personOptions={cosplayerNames}
        dayOptions={allRelatedEvents}
      />

      {/* ── Detail drawer ──────────────────────────────────────────── */}
      <CosplayDetailDrawer
        cosplay={detailCosplay}
        events={allRelatedEvents}
        users={users}
        open={detailCosplay !== null}
        onClose={() => setDetailCosplay(null)}
        onDelete={handleDelete}
        deleteLoading={deleteMutation.isPending}
      />
    </div>
  );
}
