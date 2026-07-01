import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Plus, Users, Image, Upload, X,
  CheckCircle2, SlidersHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCalendar } from "../hooks/useCalendar";
import { useCosplays, useCreateCosplay, useDeleteCosplay } from "../hooks/useCosplays";
import { useUsers } from "../hooks/useUsers";
import { CosplayCard } from "../components/cosplay/CosplayCard";
import { CosplayDetailDrawer } from "../components/cosplay/CosplayDetailDrawer";
import {
  CosplayFilterDrawer,
  DEFAULT_COSPLAY_FILTERS,
  cosplayActiveFilterCount,
  SORT_LABELS,
  type CosplayFilterState,
} from "../components/cosplay/CosplayFilterDrawer";
import { Drawer } from "../components/common/Drawer";
import { Button } from "../components/common/Button";
import { NamePicker } from "../components/common/NamePicker";
import { UserAvatar } from "../components/common/UserAvatar";
import { uploadCosplayImage } from "../services/storage.service";
import { toast } from "../store/toast.store";
import { formatDate } from "../utils/format";
import { listContainer, listItem } from "../utils/motion";
import type { Cosplay } from "../types";

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

const SF = "space-y-4 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const ST = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3";
const SL = "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";

// ── Page ──────────────────────────────────────────────────────────────────────

export function EventCosplaysPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: events = [] }             = useCalendar();
  const { data: cosplays = [], isLoading } = useCosplays();
  const { data: users = [] }              = useUsers();

  const createMutation = useCreateCosplay();
  const deleteMutation = useDeleteCosplay();

  const event = events.find((e) => e.id === id);

  const siblingEvents = event?.multi_day_id
    ? events.filter((e) => e.multi_day_id === event.multi_day_id && e.id !== event.id)
    : [];
  const allRelatedEvents = event
    ? [event, ...siblingEvents].sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const isMultiDay = siblingEvents.length > 0;

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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <Sparkles size={40} className="opacity-30" />
        <p className="text-sm">Evenement niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">Terug</button>
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

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">

      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4
                      bg-white/90 dark:bg-slate-950/90 backdrop-blur-md
                      border-b border-slate-200 dark:border-white/[0.06]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">Cosplays</p>
          <p className="text-[10px] text-slate-400 leading-tight truncate">{event.event_name}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-3 py-1.5 text-xs font-bold text-white
                     hover:bg-violet-600 active:bg-violet-700 transition-colors shrink-0"
        >
          <Plus size={14} />
          Toevoegen
        </button>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 140 }}>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 15% 50%, #4c1d9580 0%, transparent 60%),
              radial-gradient(ellipse at 85% 25%, #0f172a 0%, transparent 55%),
              linear-gradient(150deg, #0f172a 0%, #3b0764 55%, #4c1d95 100%)
            `,
          }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.12] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <filter id="cosplay-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#cosplay-noise)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
          <Sparkles size={140} strokeWidth={1} className="text-white" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/60 mb-1">
            {event.event_name}
          </p>
          <h1 className="text-2xl font-black text-white drop-shadow-md mb-3">Cosplays</h1>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5">
              <Sparkles size={12} className="text-white/60" />
              <span className="text-xs font-bold text-white">
                {eventCosplays.length} {eventCosplays.length === 1 ? "cosplay" : "cosplays"}
              </span>
            </div>
            {cosplayerNames.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5">
                <Users size={12} className="text-white/60" />
                <div className="flex -space-x-1.5">
                  {cosplayerNames.slice(0, 6).map((name) => {
                    const u = users.find((x) => x.name === name || x.discord_username === name);
                    return (
                      <UserAvatar key={name} name={u?.name ?? name} user={u} className="h-5 w-5 text-[7px] ring-1 ring-black/30" />
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-white">
                  {cosplayerNames.length} {cosplayerNames.length === 1 ? "persoon" : "personen"}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pb-10 pt-5">

        {/* Filter toolbar */}
        {!isLoading && eventCosplays.length > 0 && (
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-3">
              {/* Filter trigger */}
              <button
                onClick={() => setFilterOpen(true)}
                className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  activeFilterCount > 0
                    ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                    : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-700/50"
                }`}
              >
                <SlidersHorizontal size={13} />
                Filter & Sorteren
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Result count */}
              <span className="text-xs text-slate-400 ml-auto">
                {isFiltered
                  ? `${filtered.length} van ${eventCosplays.length} cosplays`
                  : `${eventCosplays.length} ${eventCosplays.length === 1 ? "cosplay" : "cosplays"}`}
              </span>
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
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300"
                    >
                      {name}
                      <button
                        onClick={() => removePersonFilter(name)}
                        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-violet-200 dark:hover:bg-violet-700/40 transition-colors"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  {filters.days.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                      {filters.days.length} {filters.days.length === 1 ? "dag" : "dagen"}
                      <button
                        onClick={removeDayFilter}
                        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-violet-200 dark:hover:bg-violet-700/40 transition-colors"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  )}
                  {filters.sort !== "newest" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                      {SORT_LABELS[filters.sort]}
                      <button
                        onClick={removeSortFilter}
                        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-violet-200 dark:hover:bg-violet-700/40 transition-colors"
                      >
                        <X size={9} />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface rounded-2xl overflow-hidden animate-pulse">
                <div className="h-[3px] bg-violet-200 dark:bg-violet-900/40" />
                <div className="flex">
                  <div className="flex-1 p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="flex gap-1.5">
                      <div className="h-4 w-16 bg-violet-100 dark:bg-violet-900/30 rounded-full" />
                    </div>
                  </div>
                  <div className="w-20 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state (no cosplays at all) ── */}
        {!isLoading && eventCosplays.length === 0 && (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30">
              <Sparkles size={28} className="text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Nog geen cosplays gedeeld
              </p>
              <p className="text-xs text-slate-400 mt-1">Laat anderen weten wat je draagt!</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white
                         hover:bg-violet-600 active:bg-violet-700 transition-colors shadow-lg shadow-violet-500/20"
            >
              <Plus size={16} />
              Eerste cosplay toevoegen
            </button>
          </div>
        )}

        {/* ── Filtered empty state ── */}
        {!isLoading && eventCosplays.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <SlidersHorizontal size={32} className="text-slate-300 dark:text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Geen cosplays gevonden
              </p>
              <p className="text-xs text-slate-400 mt-1">Pas je filters aan of wis ze.</p>
            </div>
            <button
              onClick={() => setFilters(DEFAULT_COSPLAY_FILTERS)}
              className="text-xs font-semibold text-violet-500 hover:text-violet-600 underline"
            >
              Filters wissen
            </button>
          </div>
        )}

        {/* ── Grid ── */}
        {!isLoading && paginated.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
                  className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-violet-800/40
                             flex flex-col items-center justify-center gap-2.5 py-10
                             text-slate-400 dark:text-slate-600
                             hover:border-violet-400 dark:hover:border-violet-500
                             hover:text-violet-500 dark:hover:text-violet-400
                             transition-all duration-150 cursor-pointer min-h-[120px] group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-current transition-colors">
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
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08]
                         text-slate-500 dark:text-slate-400 disabled:opacity-30
                         hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-violet-400
                         transition-colors disabled:cursor-not-allowed"
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
                  <span key={p} className="w-8 text-center text-xs text-slate-400">…</span>
                );
              }
              if (!show) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 min-w-[2rem] px-2 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-violet-500 text-white shadow-md shadow-violet-500/20"
                      : "border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-violet-400"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08]
                         text-slate-500 dark:text-slate-400 disabled:opacity-30
                         hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-violet-400
                         transition-colors disabled:cursor-not-allowed"
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
            {!selectedUser && <p className="text-xs text-slate-400 mt-1">Selecteer de persoon die dit cosplay draagt.</p>}
          </div>

          <div className={SF}>
            <p className={ST}>Karakter</p>
            <div>
              <label className={SL}>Karakter naam *</label>
              <input className="input-field" placeholder="Bijv. Luffy, Batman, Pikachu…" autoComplete="off" {...register("character_name")} />
              {errors.character_name && <p className="mt-1.5 text-xs text-rose-500">{errors.character_name.message}</p>}
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
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                      selectedDays.includes(e.id)
                        ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-slate-200 dark:border-white/[0.08] hover:border-violet-300 dark:hover:border-violet-600/50"
                    }`}
                  >
                    <input type="checkbox" className="h-4 w-4 rounded accent-violet-500 shrink-0" checked={selectedDays.includes(e.id)} onChange={() => toggleDay(e.id)} />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDate(e.date)}</span>
                    <span className="text-xs text-slate-400 ml-auto">{e.event_name}</span>
                  </label>
                ))}
              </div>
              {selectedDays.length === 0 && <p className="text-xs text-rose-500">Selecteer minimaal één dag.</p>}
            </div>
          )}

          <div className={SF}>
            <p className={ST}>Inspiratie afbeeldingen (optioneel)</p>
            <div className="space-y-3">
              {images.map((entry, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center gap-0.5">
                    {(["url", "file"] as const).map((m) => (
                      <button
                        key={m} type="button" onClick={() => setImageField(index, { mode: m })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          entry.mode === m
                            ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                      >
                        {m === "url" ? "Link" : "Bestand"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.mode === "url" ? (
                      <>
                        <Image size={14} className="text-slate-400 shrink-0" />
                        <input
                          className="input-field flex-1"
                          placeholder="https://i.imgur.com/… of Pinterest URL"
                          value={entry.url}
                          onChange={(e) => setImageField(index, { url: e.target.value })}
                        />
                      </>
                    ) : (
                      <label className={`flex-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        entry.url
                          ? "border-emerald-300 dark:border-emerald-600/50 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-slate-200 dark:border-white/[0.08] hover:border-violet-300 dark:hover:border-violet-600/40 bg-slate-50 dark:bg-white/[0.02]"
                      }`}>
                        {entry.uploading
                          ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent shrink-0" />
                          : entry.url
                          ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          : <Upload size={14} className="text-slate-400 shrink-0" />}
                        <span className={`text-xs font-medium truncate ${entry.url ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                          {entry.uploading ? "Uploaden…" : entry.url ? "Geüpload" : "Kies afbeelding…"}
                        </span>
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(index, f); }} />
                      </label>
                    )}
                    {images.length > 1 && (
                      <button type="button" onClick={() => removeImage(index)} className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addImage} className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors mt-1">
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
