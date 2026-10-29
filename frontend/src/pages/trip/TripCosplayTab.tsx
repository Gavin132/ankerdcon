import { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles, Plus, Image, Upload, UploadCloud, X,
  CheckCircle2, SlidersHorizontal, ChevronLeft, ChevronRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCosplays, useCreateCosplay, useDeleteCosplay } from "../../hooks/useCosplays";
import { uploadCosplayImage } from "../../services/cosplays.service";
import { compressImage } from "../../utils/imageCompression";
import { useUsers, useCurrentUser, useActingPermissions } from "../../hooks/useUsers";
import { CosplayCard } from "../../components/cosplay/CosplayCard";
import { CosplayDetailBody, CosplayDetailFooter } from "../../components/cosplay/CosplayDetailView";
import {
  CosplayFilterPanel,
  CosplayFilterFooter,
  DEFAULT_COSPLAY_FILTERS,
  cosplayActiveFilterCount,
  SORT_LABELS,
  type CosplayFilterState,
} from "../../components/cosplay/CosplayFilterPanel";
import { TripSheet } from "../../components/trip/TripSheet";
import { SelectableDayCards } from "../../components/trip/SelectableDayCards";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { Segmented } from "../../components/common/Segmented";
import { NamePicker } from "../../components/common/NamePicker";
import { toast } from "../../store/toast.store";
import { ApiError } from "../../lib/api/client";
import { listContainer } from "../../utils/motion";
import { useTrip } from "./tripContext";
import { useIsViewer } from "../../hooks/useIsViewer";
import type { Cosplay } from "../../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

/** Inspiration images per cosplay; the backend enforces the same limit. */
const MAX_IMAGES = 3;

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
  /** Set on a network-shaped upload failure instead of just erroring out —
   * `blob` is the already-compressed file, kept so a retry doesn't need the
   * user to pick it again. Cleared the moment the retry succeeds. This only
   * lives for as long as the form itself does (same as the rest of the
   * draft): closing the sheet loses it, same as it always has. */
  queued?: boolean;
  blob?: Blob;
}

// Flat form sections separated by a divider; labels follow the design system.
const SF = "space-y-3 border-t-1.5 border-line pt-5 first:border-t-0 first:pt-0";
const ST = "section-label";
const SL = "field-label";

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Event › Cosplay, opened as a bottom sheet over Overzicht: every cosplay
 * planned for any day of the trip. Adding one, filtering, and opening a single
 * cosplay each swap the sheet to their own view with a back arrow — the same
 * list/form pattern as Vervoer — instead of stacking a second overlay on top.
 */
export function TripCosplaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const viewer = useIsViewer();
  const { trip, dayId } = useTrip();
  const firstConDay = trip.days.find((d) => d.ev.has_con !== false) ?? trip.days[0];
  const id = dayId ?? firstConDay.ev.id;

  const { data: cosplays = [], isLoading } = useCosplays();
  const { data: users = [] }              = useUsers();
  const { actable } = useActingPermissions();
  const { data: currentUser }             = useCurrentUser();

  const createMutation = useCreateCosplay();
  const deleteMutation = useDeleteCosplay();

  const event = trip.days.find((d) => d.ev.id === id)?.ev;
  const allRelatedEvents = trip.days.map((d) => d.ev);
  const isMultiDay = trip.days.length > 1;

  const relatedIds = new Set(allRelatedEvents.map((e) => e.id));
  const eventCosplays = cosplays.filter((c) =>
    c.linked_event_ids.some((eid) => relatedIds.has(eid)),
  );

  const countByDay: Record<string, number> = {};
  for (const c of eventCosplays) for (const eid of c.linked_event_ids) countByDay[eid] = (countByDay[eid] ?? 0) + 1;

  const userNames       = users.map((u) => u.name);
  const cosplayerNames  = [...new Set(eventCosplays.map((c) => c.user_name))];

  // ── Filter & sort ─────────────────────────────────────────────────────────

  const [filters, setFilters]     = useState<CosplayFilterState>(DEFAULT_COSPLAY_FILTERS);
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

  // ── Create form (a second view inside the same sheet) ──────────────────────

  const [view, setView] = useState<"list" | "form" | "filter" | "detail">("list");

  // Reopening starts on the list, not wherever the sheet was left.
  useEffect(() => {
    if (!open) setView("list");
  }, [open]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(id ? [id] : []);
  const [images, setImages]           = useState<ImageEntry[]>([{ mode: "url", url: "", uploading: false }]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CosplayForm>({ resolver: zodResolver(schema) });

  function openCreate() {
    reset();
    setSelectedUser(currentUser?.name ?? "");
    setSelectedDays(id ? [id] : []);
    setImages([{ mode: "url", url: "", uploading: false }]);
    setView("form");
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
    setImages((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, { mode: "url", url: "", uploading: false }]));
  }
  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileChange(index: number, file: File) {
    setImageField(index, { uploading: true, queued: false });
    let blob: Blob;
    try {
      blob = await compressImage(file);
    } catch {
      toast("error", "Kon afbeelding niet verwerken. Probeer een andere afbeelding.");
      setImageField(index, { uploading: false });
      return;
    }
    if (!navigator.onLine) {
      queueImage(index, blob);
      return;
    }
    try {
      const url = await uploadCosplayImage(blob);
      setImageField(index, { url, uploading: false, queued: false, blob: undefined });
    } catch (err) {
      // A timeout is what a slow or stuck connection looks like (see the client's limit).
      const slow = err instanceof ApiError && (err.status === 0 || err.status === 503 || err.status === 524);
      if (slow) {
        queueImage(index, blob);
      } else {
        toast("error", "Upload mislukt. Probeer een andere afbeelding, of plak een link.");
        setImageField(index, { uploading: false });
      }
    }
  }

  /** Parks a compressed image on a network-shaped failure instead of giving
   * up, and lets `retryQueuedImages` pick it back up once the connection
   * looks like it's back. */
  function queueImage(index: number, blob: Blob) {
    setImageField(index, { uploading: false, queued: true, blob });
    toast("info", "Geen verbinding — deze afbeelding wordt automatisch opnieuw geprobeerd.");
  }

  // Read inside the retry loop instead of closing over `images` directly —
  // that array changes on every keystroke in a URL field too, and depending
  // on it here would tear down and rebuild the interval before it ever gets
  // a chance to fire.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // Retries every queued image slot when the browser thinks it's back online,
  // or the sheet regains focus — same triggers as the story-photo queue,
  // just scoped to this still-open form instead of IndexedDB, since a draft
  // cosplay that's never been saved has nowhere durable to resume from.
  useEffect(() => {
    async function retryQueuedImages() {
      if (!navigator.onLine) return;
      for (const [index, entry] of imagesRef.current.entries()) {
        if (!entry.queued || !entry.blob) continue;
        setImageField(index, { uploading: true, queued: false });
        try {
          const url = await uploadCosplayImage(entry.blob);
          setImageField(index, { url, uploading: false, blob: undefined });
          toast("success", "Wachtende afbeelding alsnog geüpload!");
        } catch (err) {
          const slow = err instanceof ApiError && (err.status === 0 || err.status === 503 || err.status === 524);
          if (slow) setImageField(index, { uploading: false, queued: true });
          else {
            setImageField(index, { uploading: false, queued: false, blob: undefined });
            toast("error", "Een wachtende afbeelding kon niet worden verzonden. Probeer opnieuw.");
          }
        }
      }
    }

    window.addEventListener("online", retryQueuedImages);
    document.addEventListener("visibilitychange", retryQueuedImages);
    const interval = setInterval(retryQueuedImages, 20_000);
    return () => {
      window.removeEventListener("online", retryQueuedImages);
      document.removeEventListener("visibilitychange", retryQueuedImages);
      clearInterval(interval);
    };
  }, []);

  async function onSubmit(values: CosplayForm) {
    if (!selectedUser) { toast("error", "Selecteer wie dit cosplay draagt."); return; }
    if (selectedDays.length === 0) { toast("error", "Selecteer minimaal één dag."); return; }
    if (images.some((img) => img.queued)) {
      toast("error", "Nog een afbeelding aan het verzenden — wacht heel even, of verwijder hem.");
      return;
    }
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
      setView("list");
      toast("success", `${values.character_name} toegevoegd!`);
    } catch {
      toast("error", "Kon cosplay niet opslaan. Probeer opnieuw.");
    }
  }

  // ── Detail drawer ─────────────────────────────────────────────────────────

  const [detailCosplay, setDetailCosplay] = useState<Cosplay | null>(null);

  function openDetail(cosplay: Cosplay) {
    setDetailCosplay(cosplay);
    setView("detail");
  }

  async function handleDelete(cosplayId: string) {
    try {
      await deleteMutation.mutateAsync(cosplayId);
      setDetailCosplay(null);
      setView("list");
      toast("success", "Cosplay verwijderd.");
    } catch {
      toast("error", "Verwijderen mislukt.");
    }
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
    "inline-flex items-center gap-1.5 rounded-full border-1.5 border-line bg-surface py-1 pl-2.5 pr-1 text-[12px] font-semibold text-ink-2";
  const removeChipButton =
    "hit-area flex h-5 w-5 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink";
  const pageArrow =
    "hit-area flex h-9 w-9 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line";

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      viewKey={view}
      onBack={view !== "list" ? () => setView("list") : undefined}
      title={
        view === "form" ? "Cosplay toevoegen"
        : view === "filter" ? "Filter & sorteren"
        : view === "detail" && detailCosplay ? detailCosplay.character_name
        : "Cosplay"
      }
      subtitle={
        view === "form" ? "Laat zien wat je draagt!"
        : view === "filter" ? "Vind het cosplay dat je zoekt"
        : view === "detail" ? detailCosplay?.series ?? undefined
        : trip.title
      }
      footer={
        view === "form" ? createFooter
        : view === "filter" ? (
          <CosplayFilterFooter
            activeCount={activeFilterCount}
            onReset={() => setFilters(DEFAULT_COSPLAY_FILTERS)}
            onDone={() => setView("list")}
          />
        )
        : view === "detail" && detailCosplay ? (
          <CosplayDetailFooter cosplay={detailCosplay} onDelete={handleDelete} deleteLoading={deleteMutation.isPending} />
        )
        : undefined
      }
    >
      {!event ? (
        <EmptyState icon={<Sparkles size={22} />} title="Deze dag bestaat niet meer" />
      ) : view === "filter" ? (
        <CosplayFilterPanel
          filters={filters}
          onChange={setFilters}
          personOptions={cosplayerNames}
          days={trip.days}
          countByDay={countByDay}
        />
      ) : view === "detail" && detailCosplay ? (
        <CosplayDetailBody
          cosplay={detailCosplay}
          events={allRelatedEvents}
          users={users}
          onLeave={onClose}
        />
      ) : view === "form" ? (
        <form id="cosplay-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          <div className={SF}>
            <p className={ST}>Wie draagt dit?</p>
            <NamePicker options={actable(userNames)} value={selectedUser} onChange={setSelectedUser} placeholder="Zoek naam…" color="sky" />
            {!selectedUser && <p className="mt-1 text-xs text-ink-3">Selecteer de persoon die dit cosplay draagt.</p>}
          </div>

          <div className={SF}>
            <p className={ST}>Karakter</p>
            <div>
              <label className={SL}>Karakter naam *</label>
              <input className="input-field" placeholder="Bijv. Luffy, Batman, Pikachu…" autoComplete="off" {...register("character_name")} />
              {errors.character_name && <p className="field-error">{errors.character_name.message}</p>}
            </div>
            <div>
              <label className={SL}>Serie / film / game (optioneel)</label>
              <input className="input-field" placeholder="Bijv. One Piece, DC Comics…" autoComplete="off" {...register("series")} />
            </div>
          </div>

          {isMultiDay && (
            <div className={SF}>
              <p className={ST}>Welke dag(en)?</p>
              <SelectableDayCards
                days={trip.days}
                selected={selectedDays}
                onToggle={toggleDay}
                caption={(d) => {
                  const n = countByDay[d.ev.id] ?? 0;
                  return `${n} ${n === 1 ? "cosplay" : "cosplays"}`;
                }}
                label="Welke dagen draag je dit?"
              />
              {selectedDays.length === 0 && <p className="field-error">Selecteer minimaal één dag.</p>}
            </div>
          )}

          <div className={SF}>
            <p className={ST}>Inspiratie afbeeldingen (optioneel)</p>
            <div className="space-y-3">
              {images.map((entry, index) => (
                <div key={index} className="space-y-1.5">
                  <Segmented
                    label="Soort afbeelding"
                    options={[{ value: "url", label: "Link" }, { value: "file", label: "Bestand" }]}
                    value={entry.mode}
                    onChange={(m) => setImageField(index, { mode: m })}
                  />
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
                          ? "border-ok-line bg-ok-soft"
                          : entry.queued
                          ? "border-warn-line bg-warn-soft"
                          : "border-line bg-surface hover:border-ink-3"
                      }`}>
                        {entry.uploading
                          ? <Loader2 size={14} className="shrink-0 animate-spin text-ink-3" />
                          : entry.url
                          ? <CheckCircle2 size={14} className="shrink-0 text-ok" />
                          : entry.queued
                          ? <UploadCloud size={14} className="shrink-0 text-warn" />
                          : <Upload size={14} className="shrink-0 text-ink-3" />}
                        <span className={`truncate text-xs font-medium ${
                          entry.url ? "text-ok" : entry.queued ? "text-warn" : "text-ink-2"
                        }`}>
                          {entry.uploading
                            ? "Uploaden…"
                            : entry.url
                            ? "Geüpload"
                            : entry.queued
                            ? "Wacht op verbinding…"
                            : "Kies afbeelding…"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={entry.uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            // Cleared so choosing the same file again (after a failure) still fires.
                            e.target.value = "";
                            if (f) handleFileChange(index, f);
                          }}
                        />
                      </label>
                    )}
                    {images.length > 1 && (
                      <button type="button" onClick={() => removeImage(index)} aria-label="Afbeelding verwijderen" className="hit-area flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-bad-soft hover:text-bad">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {images.length < MAX_IMAGES ? (
              <button type="button" onClick={addImage} className="hit-area flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-text hover:underline">
                <Plus size={14} />
                Afbeelding toevoegen <span className="font-mono font-normal text-ink-3">({images.length}/{MAX_IMAGES})</span>
              </button>
            ) : (
              <p className="text-[12.5px] text-ink-3">Maximaal {MAX_IMAGES} afbeeldingen.</p>
            )}
          </div>

          <div className={SF}>
            <p className={ST}>Notities (optioneel)</p>
            <textarea className="input-field resize-none" rows={3} placeholder="Extra info over je cosplay, progress updates…" {...register("notes")} />
          </div>
        </form>
      ) : (
        <div>
          {/* Filter toolbar */}
          {!isLoading && eventCosplays.length > 0 && (
            <div className="mb-5 space-y-3">
              <div className="flex items-center gap-2">
                {/* Filter trigger */}
                <button
                  onClick={() => setView("filter")}
                  className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    activeFilterCount > 0
                      ? "border-1.5 border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                      : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  Filter & sorteren
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-paper text-[12px] font-semibold leading-none text-ink">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {!viewer && (
                  <button onClick={openCreate} className="btn-primary ml-auto min-h-11 shrink-0 px-3 py-2 text-xs">
                    <Plus size={14} />
                    Toevoegen
                  </button>
                )}
              </div>

              {/* Result count */}
              <p className="text-xs tabular-nums text-ink-3">
                {isFiltered
                  ? `${filtered.length} van ${eventCosplays.length} cosplays`
                  : `${eventCosplays.length} ${eventCosplays.length === 1 ? "cosplay" : "cosplays"}`}
              </p>

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
                        <button onClick={() => removePersonFilter(name)} aria-label={`Filter ${name} verwijderen`} className={removeChipButton}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    {filters.days.length > 0 && (
                      <span className={removableChip}>
                        {filters.days.length} {filters.days.length === 1 ? "dag" : "dagen"}
                        <button onClick={removeDayFilter} aria-label="Dagfilter verwijderen" className={removeChipButton}>
                          <X size={11} />
                        </button>
                      </span>
                    )}
                    {filters.sort !== "newest" && (
                      <span className={removableChip}>
                        {SORT_LABELS[filters.sort]}
                        <button onClick={removeSortFilter} aria-label="Sortering verwijderen" className={removeChipButton}>
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-surface overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] w-full border-b-1.5 border-line bg-sunken" />
                  <div className="space-y-2.5 p-3">
                    <div className="h-4 w-3/4 rounded-md bg-sunken" />
                    <div className="h-3 w-1/2 rounded-md bg-sunken" />
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-sunken" />
                      <div className="h-3 w-16 rounded-md bg-sunken" />
                    </div>
                    <div className="h-4 w-20 rounded-md bg-sunken" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state (no cosplays at all) ── */}
          {!isLoading && eventCosplays.length === 0 && (
            <EmptyState
              icon={<Sparkles size={22} />}
              title="Nog geen cosplays gedeeld"
              description="Laat anderen weten wat je draagt!"
              action={
                !viewer && (
                  <button onClick={openCreate} className="btn-primary px-4 py-2.5 text-sm">
                    <Plus size={16} />
                    Eerste cosplay toevoegen
                  </button>
                )
              }
            />
          )}

          {/* ── Filtered empty state ── */}
          {!isLoading && eventCosplays.length > 0 && filtered.length === 0 && (
            <EmptyState
              icon={<SlidersHorizontal size={22} />}
              title="Geen cosplays gevonden"
              description="Pas je filters aan of wis ze."
              action={
                <button onClick={() => setFilters(DEFAULT_COSPLAY_FILTERS)} className="hit-area text-[12.5px] font-semibold text-brand-text hover:underline">
                  Filters wissen
                </button>
              }
            />
          )}

          {/* ── Grid ── */}
          {!isLoading && paginated.length > 0 && (
            <motion.div
              className="grid grid-cols-2 gap-3 md:grid-cols-3"
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
                    onClick={() => openDetail(cosplay)}
                  />
                ))}

              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Pagination ── */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Vorige pagina"
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
                    <span key={p} className="w-9 text-center text-xs text-ink-3">…</span>
                  );
                }
                if (!show) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-label={`Pagina ${p}`}
                    aria-current={active ? "page" : undefined}
                    className={`hit-area h-9 min-w-[2.25rem] rounded-xl px-2 font-mono text-xs font-semibold tabular-nums transition-colors ${
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
                aria-label="Volgende pagina"
                className={pageArrow}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </TripSheet>
  );
}
