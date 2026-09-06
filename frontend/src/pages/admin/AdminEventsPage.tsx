import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, CalendarDays, Hotel, X as XIcon, Tag, Check, History, Upload, Link2,
  ChevronDown, ChevronUp, UserPlus, Trash2,
} from "lucide-react";
import type { TicketType, Event, EventDay } from "../../types";
import {
  useAdminEvents,
  useAdminEventDays,
  useAdminUsers,
  useAdminCreateEvent,
  useAdminUpdateEvent,
  useAdminDeleteEvent,
  useAdminCreateEventDay,
  useAdminUpdateEventDay,
  useAdminDeleteEventDay,
  useAdminRemoveEventParticipant,
  useAdminEventGroups,
  useAdminBulkDeleteEvents,
  useAdminBulkSetEventGroup,
} from "../../hooks/useAdmin";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminDrawer } from "./AdminDrawer";
import { toast } from "../../store/toast.store";
import { routes } from "../../config/routes";
import { F, SECTION, SECTION_TITLE } from "./styles";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { uploadEventCoverImage } from "../../services/storage.service";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { useTableSelection } from "../../hooks/useTableSelection";
import { formatDate } from "../../utils/format";
import { parseEventDate } from "../../utils/date";

const optStr = z.preprocess((v) => (v == null ? "" : v), z.string());
const optUrl = z.preprocess(
  (v) => (v == null ? "" : v),
  z.string().url("Voer een geldige URL in").or(z.literal("")),
);

const eventSchema = z.object({
  event_name: z.string().min(1, "Naam is verplicht"),
  event_group_id: optStr,
  is_hotel: z.boolean().optional(),
  hotel_location: optStr,
  image_url: optUrl,
  description: optStr,
  location: optStr,
  website: optUrl,
  ticket_url: optUrl,
  ticket_sale_start: optStr,
  locker_info: optStr,
  parking_info: optStr,
  special_instructions: optStr,
  what_to_bring: optStr,
});
type EventForm = z.infer<typeof eventSchema>;

const PAGE_SIZE = 15;

function dateRange(days: EventDay[]): { first: Date | null; last: Date | null } {
  const parsed = days.map((d) => parseEventDate(d.date)).filter((d): d is Date => d !== null);
  if (!parsed.length) return { first: null, last: null };
  return {
    first: new Date(Math.min(...parsed.map((d) => d.getTime()))),
    last: new Date(Math.max(...parsed.map((d) => d.getTime()))),
  };
}

function uniqueParticipants(days: EventDay[]): string[] {
  return [...new Set(days.flatMap((d) => d.participants))];
}

// ── Days section (inside the drawer, existing events only) ────────────────────

function DaysSection({ eventId, days }: { eventId: string; days: EventDay[] }) {
  const createDay = useAdminCreateEventDay();
  const updateDay = useAdminUpdateEventDay();
  const deleteDay = useAdminDeleteEventDay();
  const removeParticipant = useAdminRemoveEventParticipant();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newHasCon, setNewHasCon] = useState(true);

  const sorted = [...days].sort(
    (a, b) => (parseEventDate(a.date)?.getTime() ?? 0) - (parseEventDate(b.date)?.getTime() ?? 0),
  );

  async function handleAddDay() {
    if (!newDate) return;
    try {
      await createDay.mutateAsync({ eventId, payload: { date: newDate, has_con: newHasCon } });
      toast("success", "Dag toegevoegd.");
      setNewDate("");
      setNewHasCon(true);
    } catch {
      toast("error", "Kon dag niet toevoegen.");
    }
  }

  async function handleToggleCon(day: EventDay) {
    try {
      await updateDay.mutateAsync({ dayId: day.id, payload: { has_con: !day.has_con } });
    } catch {
      toast("error", "Kon dag niet bijwerken.");
    }
  }

  async function handleDeleteDay(day: EventDay) {
    try {
      await deleteDay.mutateAsync(day.id);
      toast("success", "Dag verwijderd.");
    } catch {
      toast("error", "Kon dag niet verwijderen.");
    }
  }

  async function handleRemoveParticipant(dayId: string, name: string) {
    try {
      await removeParticipant.mutateAsync({ dayId, participant: name });
    } catch {
      toast("error", "Kon deelnemer niet verwijderen.");
    }
  }

  return (
    <div className={SECTION}>
      <p className={SECTION_TITLE}>Dagen ({days.length})</p>
      <p className="text-xs text-slate-500 -mt-1">
        Vink "Con" uit voor een dag die alleen reizen/hotel is, zonder convention die dag.
      </p>

      <div className="space-y-2">
        {sorted.map((day) => {
          const isExpanded = expandedDay === day.id;
          return (
            <div key={day.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <CalendarDays size={14} className="text-slate-500 shrink-0" />
                <span className="text-sm font-semibold text-white flex-1">
                  {formatDate(day.date)}
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={day.has_con}
                    onChange={() => handleToggleCon(day)}
                    className="cb"
                  />
                  Con
                </label>
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <UserPlus size={12} />
                  {day.participants.length}
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDay(day)}
                  disabled={deleteDay.isPending}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {isExpanded && (
                <div className="border-t border-white/[0.06] px-3 py-2.5 space-y-1.5">
                  {day.participants.length === 0 ? (
                    <p className="text-xs text-slate-500">Nog geen aanmeldingen.</p>
                  ) : (
                    day.participants.map((p) => (
                      <div key={p} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                        <UserAvatar name={p} className="h-5 w-5 text-[7px]" />
                        <span className="flex-1 text-xs text-slate-300">{p}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(day.id, p)}
                          disabled={removeParticipant.isPending}
                          className="text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-40"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2 pt-1">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Nieuwe dag</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={`${F} [color-scheme:dark]`}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-400 pb-2.5 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={newHasCon} onChange={(e) => setNewHasCon(e.target.checked)} className="cb" />
          Con
        </label>
        <button
          type="button"
          onClick={handleAddDay}
          disabled={!newDate || createDay.isPending}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          <Plus size={14} />
          Toevoegen
        </button>
      </div>
    </div>
  );
}

// ── Event drawer ──────────────────────────────────────────────────────────────

function EventDrawer({
  event,
  days,
  onClose,
  onCreated,
}: {
  event: Event | "new" | null;
  days: EventDay[];
  onClose: () => void;
  onCreated: (event: Event) => void;
}) {
  const createMutation = useAdminCreateEvent();
  const updateMutation = useAdminUpdateEvent();
  const { data: eventGroups = [] } = useAdminEventGroups();
  const isEdit = event !== null && event !== "new";
  const editEvent = event !== null && event !== "new" ? event : null;
  const open = event !== null;

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(
    isEdit ? (event.ticket_types ?? []) : []
  );
  const [ttTitle, setTtTitle] = useState("");
  const [ttPrice, setTtPrice] = useState("");

  const [imageUploading, setImageUploading] = useState(false);
  const [imageUrlMode, setImageUrlMode] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  function addTicketType() {
    const price = parseFloat(ttPrice);
    if (!ttTitle.trim() || isNaN(price) || price < 0) return;
    setTicketTypes((prev) => [...prev, { title: ttTitle.trim(), price }]);
    setTtTitle("");
    setTtPrice("");
  }

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      event_name: isEdit ? event.event_name : "",
      event_group_id: isEdit ? (event.event_group_id ?? "") : "",
      is_hotel: isEdit ? event.is_hotel : false,
      hotel_location: isEdit ? (event.hotel_location ?? "") : "",
      image_url: isEdit ? (event.image_url ?? "") : "",
      description: isEdit ? (event.description ?? "") : "",
      location: isEdit ? (event.location ?? "") : "",
      website: isEdit ? (event.website ?? "") : "",
      ticket_url: isEdit ? (event.ticket_url ?? "") : "",
      ticket_sale_start: isEdit ? (event.ticket_sale_start ?? "") : "",
      locker_info: isEdit ? (event.locker_info ?? "") : "",
      parking_info: isEdit ? (event.parking_info ?? "") : "",
      special_instructions: isEdit ? (event.special_instructions ?? "") : "",
      what_to_bring: isEdit ? (event.what_to_bring ?? "") : "",
    },
  });

  async function onSubmit(values: EventForm) {
    const strip = (v: string | undefined) => v || undefined;
    const cleaned = {
      event_name: values.event_name,
      is_hotel: values.is_hotel,
      hotel_location: strip(values.hotel_location),
      event_group_id: strip(values.event_group_id),
      image_url: strip(values.image_url),
      description: strip(values.description),
      location: strip(values.location),
      website: strip(values.website),
      ticket_url: strip(values.ticket_url),
      ticket_sale_start: strip(values.ticket_sale_start),
      locker_info: strip(values.locker_info),
      parking_info: strip(values.parking_info),
      special_instructions: strip(values.special_instructions),
      what_to_bring: strip(values.what_to_bring),
      ticket_types: ticketTypes,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: event.id, ...cleaned });
        toast("success", "Evenement bijgewerkt.");
      } else {
        const created = await createMutation.mutateAsync(cleaned);
        toast("success", `${values.event_name} aangemaakt. Voeg nu de dagen toe.`);
        onCreated(created);
        return;
      }
      onClose();
    } catch {
      toast("error", "Kon evenement niet opslaan.");
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || imageUploading;
  const currentImageUrl = watch("image_url");

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("error", "Alleen afbeeldingen zijn toegestaan.");
      return;
    }
    setImageUploading(true);
    try {
      const url = await uploadEventCoverImage(file);
      setValue("image_url", url, { shouldValidate: true });
    } catch (err) {
      console.error("[event-cover upload]", err);
      toast("error", "Afbeelding kon niet worden geüpload. Probeer het opnieuw.");
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Evenement bewerken" : "Nieuw evenement"}
      subtitle={isEdit ? event.event_name : "Maak eerst het evenement aan, voeg daarna de dagen toe"}
      footer={
        <DrawerFooter
          onCancel={onClose}
          formId="event-form"
          isPending={isPending}
          isEdit={isEdit}
        />
      }
    >
      <form
        id="event-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* ── Basisgegevens ────────────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Basisgegevens</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Naam *</label>
            <input {...register("event_name")} className={F} placeholder="DoKomi 2027" />
            {errors.event_name && (
              <p className="text-xs text-rose-400 mt-1">{errors.event_name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Groep</label>
            <select {...register("event_group_id")} className={`${F} [color-scheme:dark]`}>
              <option value="">— Geen groep —</option>
              {eventGroups.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition-colors">
            <input type="checkbox" {...register("is_hotel")} className="cb" />
            <span className="text-sm text-slate-300">Hotel beschikbaar</span>
          </label>
          {watch("is_hotel") && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hotellocatie</label>
              <Controller
                name="hotel_location"
                control={control}
                render={({ field }) => (
                  <LocationSearchInput
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    inputClassName={F}
                    placeholder="Zoek hotelnaam of adres…"
                  />
                )}
              />
              <p className="mt-1 text-xs text-slate-500">
                Gebruikt voor de snelle "rit naar hotel"-knop op het hoofdscherm.
              </p>
            </div>
          )}
        </div>

        {/* ── Dagen — first thing after naming the event, so it's visible
             right after creating without scrolling past everything else ── */}
        {editEvent ? (
          <DaysSection eventId={editEvent.id} days={days} />
        ) : (
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Dagen</p>
            <p className="text-xs text-slate-500">
              Sla het evenement eerst op — daarna kun je hier de dagen toevoegen.
            </p>
          </div>
        )}

        {/* ── Beschrijving & Locatie ────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Details</p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-slate-400">Cover afbeelding</label>
              <button
                type="button"
                onClick={() => setImageUrlMode((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-sky-400 transition-colors"
              >
                {imageUrlMode
                  ? <><Upload size={10} /> Upload</>
                  : <><Link2 size={10} /> URL invoeren</>}
              </button>
            </div>

            <input type="hidden" {...register("image_url")} />

            {imageUrlMode ? (
              <input
                className={F}
                placeholder="https://..."
                value={currentImageUrl ?? ""}
                onChange={(e) => setValue("image_url", e.target.value, { shouldValidate: true })}
              />
            ) : (
              <>
                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageFileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
                  onDragLeave={() => setImageDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImageDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleImageFile(file);
                  }}
                  disabled={imageUploading}
                  className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                    imageDragOver
                      ? "border-sky-500 bg-sky-500/10"
                      : "border-white/[0.12] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {imageUploading ? (
                    <p className="text-xs text-slate-400">Uploaden...</p>
                  ) : (
                    <>
                      <Upload size={18} className="mx-auto mb-1.5 text-slate-500" />
                      <p className="text-xs font-medium text-slate-400">Klik of sleep een afbeelding hierheen</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">PNG, JPG, WebP · liggend formaat aanbevolen</p>
                    </>
                  )}
                </button>
              </>
            )}

            {errors.image_url && (
              <p className="text-xs text-rose-400 mt-1">{errors.image_url.message}</p>
            )}

            {currentImageUrl && (
              <div className="mt-2 relative rounded-xl overflow-hidden border border-white/10">
                <img src={currentImageUrl} alt="preview" className="w-full h-28 object-cover" />
                <button
                  type="button"
                  onClick={() => setValue("image_url", "", { shouldValidate: true })}
                  className="absolute top-1.5 right-1.5 rounded-lg bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                >
                  <XIcon size={12} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Beschrijving</label>
            <textarea
              {...register("description")}
              rows={3}
              className={`${F} resize-none`}
              placeholder="Korte beschrijving van het evenement..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Locatie</label>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <LocationSearchInput
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  inputClassName={F}
                  placeholder="Zoek locatie of adres…"
                />
              )}
            />
          </div>
        </div>

        {/* ── Tickets ──────────────────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Tickets & Links</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Website</label>
              <input {...register("website")} className={F} placeholder="https://..." />
              {errors.website && (
                <p className="text-xs text-rose-400 mt-1">{errors.website.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tickets URL</label>
              <input {...register("ticket_url")} className={F} placeholder="https://..." />
              {errors.ticket_url && (
                <p className="text-xs text-rose-400 mt-1">{errors.ticket_url.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ticketverkoop start</label>
            <input
              {...register("ticket_sale_start")}
              type="datetime-local"
              className={`${F} [color-scheme:dark]`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Ticket soorten</label>
            {ticketTypes.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {ticketTypes.map((tt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5"
                  >
                    <span className="flex-1 text-sm font-medium text-slate-200">{tt.title}</span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      € {tt.price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTicketTypes((p) => p.filter((_, idx) => idx !== i))}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={ttTitle}
                onChange={(e) => setTtTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTicketType())}
                className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-colors"
                placeholder="Dagticket"
              />
              <div className="relative w-28 shrink-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  €
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={ttPrice}
                  onChange={(e) => setTtPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTicketType())}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] pl-7 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-colors"
                  placeholder="89.50"
                />
              </div>
              <button
                type="button"
                onClick={addTicketType}
                disabled={!ttTitle.trim() || !ttPrice}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-sky-700 transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
            {ticketTypes.length === 0 && (
              <p className="mt-1.5 text-xs text-slate-600">Nog geen ticket soorten toegevoegd.</p>
            )}
          </div>
        </div>

        {/* ── Praktisch ────────────────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Praktische info</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Parkeerinformatie</label>
            <textarea
              {...register("parking_info")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Parkeerplaats P1, bereikbaar via afslag 5..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Speciale instructies</label>
            <textarea
              {...register("special_instructions")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Neem afslag 5 voor de snelste route..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Wat meenemen</label>
            <textarea
              {...register("what_to_bring")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="ID, tickets, poncho, zonnebrandcrème..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Locker info</label>
            <textarea
              {...register("locker_info")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Locatie, afmeting, kosten..."
            />
          </div>
        </div>
      </form>
    </AdminDrawer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminEventsPage() {
  const navigate = useNavigate();
  const { data: events = [], isLoading: eventsLoading } = useAdminEvents();
  const { data: days = [], isLoading: daysLoading } = useAdminEventDays();
  const { data: allUsers = [] } = useAdminUsers();
  const { data: eventGroups = [] } = useAdminEventGroups();
  const isLoading = eventsLoading || daysLoading;
  const deleteMutation = useAdminDeleteEvent();
  const bulkDeleteMutation = useAdminBulkDeleteEvents();
  const bulkSetGroupMutation = useAdminBulkSetEventGroup();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [drawerId, setDrawerId] = useState<string | "new" | null>(null);
  // Holds the record just returned by the create mutation so the drawer can
  // switch straight into edit mode without waiting on the list query's
  // refetch — mutateAsync resolves before that refetch necessarily
  // completes, so relying on `events.find(...)` here left the form fields
  // empty for a moment (a real bug caught while testing this flow).
  const [justCreated, setJustCreated] = useState<Event | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const daysByEvent = useMemo(() => {
    const map = new Map<string, EventDay[]>();
    for (const d of days) {
      const arr = map.get(d.event_id) ?? [];
      arr.push(d);
      map.set(d.event_id, arr);
    }
    return map;
  }, [days]);

  const drawerEvent: Event | "new" | null =
    drawerId === "new"
      ? "new"
      : drawerId
        ? (justCreated?.id === drawerId ? justCreated : events.find((e) => e.id === drawerId)) ?? null
        : null;
  const drawerDays = drawerId && drawerId !== "new" ? (daysByEvent.get(drawerId) ?? []) : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = useMemo(
    () =>
      events.map((ev) => {
        const evDays = daysByEvent.get(ev.id) ?? [];
        const { first, last } = dateRange(evDays);
        return { ev, days: evDays, first, last, participants: uniqueParticipants(evDays) };
      }),
    [events, daysByEvent],
  );

  const filtered = enriched
    .filter(({ ev, last }) => {
      const isPast = last ? last < today : false;
      if (isPast !== showHistory) return false;
      if (groupFilter !== "All" && (ev.event_group_id ?? "") !== groupFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        ev.event_name.toLowerCase().includes(q) ||
        (ev.event_group_id ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!a.first && !b.first) return 0;
      if (!a.first) return 1;
      if (!b.first) return -1;
      return showHistory ? b.first.getTime() - a.first.getTime() : a.first.getTime() - b.first.getTime();
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  const { selectedIds, toggleSelect, selectAll, clearSelection, allSelected, indeterminate } =
    useTableSelection(paginated.map(({ ev }) => ev.id));
  const [bulkMode, setBulkMode] = useState<"idle" | "set-group">("idle");
  const [pickedGroup, setPickedGroup] = useState("");

  const bulkIsPending = bulkDeleteMutation.isPending || bulkSetGroupMutation.isPending;

  function handleClearSelection() {
    clearSelection();
    setBulkMode("idle");
    setPickedGroup("");
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast("success", `${ids.length} evenementen verwijderd.`);
      clearSelection();
    } catch {
      toast("error", "Kon evenementen niet verwijderen.");
    }
  }

  async function handleBulkSetGroup(groupId: string | null) {
    const ids = [...selectedIds];
    try {
      await bulkSetGroupMutation.mutateAsync({ eventIds: ids, groupId });
      toast("success", `Label bijgewerkt voor ${ids.length} evenementen.`);
      clearSelection();
    } catch {
      toast("error", "Kon label niet instellen.");
    }
  }

  async function handleDelete(eventId: string, name: string) {
    try {
      await deleteMutation.mutateAsync(eventId);
      toast("success", `${name} verwijderd.`);
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon evenement niet verwijderen.");
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-5">
      <AdminPageHeader
        title="Evenementen"
        subtitle={`${filtered.length} ${showHistory ? "historische" : "aankomende"} items`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowHistory((v) => !v); setPage(0); clearSelection(); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm ${
                showHistory
                  ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              <History size={16} />
              {showHistory ? "Terug naar aankomend" : "Geschiedenis"}
            </button>
            <button
              onClick={() => setDrawerId("new")}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nieuw evenement
            </button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        {eventGroups.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => { setGroupFilter("All"); setPage(0); }}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                groupFilter === "All"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              Alle
            </button>
            {eventGroups.map((g) => {
              const isActive = groupFilter === g.name;
              return (
                <button
                  key={g.id}
                  onClick={() => { setGroupFilter(g.name); setPage(0); }}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors border ${
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}
        <AdminSearch
          value={search}
          onChange={handleSearch}
          placeholder="Zoek op naam of groep..."
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
                <th className="w-10 pl-4 pr-2 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                    onChange={selectAll}
                    className="cb"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Evenement
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Data
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Info
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Deelnemers
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    {showHistory ? "Geen historische evenementen gevonden." : "Geen aankomende evenementen gevonden."}
                  </td>
                </tr>
              ) : (
                paginated.map(({ ev, days: evDays, first, last, participants }) => {
                  const isSelected = selectedIds.has(ev.id);
                  return (
                  <tr
                    key={ev.id}
                    onClick={() => evDays[0] && navigate(routes.event.view(evDays[0].id))}
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-sky-500/[0.06] hover:bg-sky-500/[0.08]" : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"}`}
                  >
                    <td
                      className="w-10 pl-4 pr-2 py-3.5"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(ev.id); }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(ev.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="cb"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10">
                          <CalendarDays size={13} className="text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {ev.event_name}
                          </p>
                          {ev.event_group_id && (
                            <span className="mt-0.5 inline-flex items-center rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                              {ev.event_group_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {!first ? "—" : !last || first.getTime() === last.getTime()
                          ? formatDate(evDays[0]?.date ?? "")
                          : `${formatDate(evDays.find((d) => parseEventDate(d.date)?.getTime() === first.getTime())?.date ?? "")} – ${formatDate(evDays.find((d) => parseEventDate(d.date)?.getTime() === last.getTime())?.date ?? "")}`
                        }
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ev.is_hotel && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-400">
                            <Hotel size={10} />
                            Hotel
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {evDays.length} {evDays.length === 1 ? "dag" : "dagen"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex -space-x-1.5">
                        {participants.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <>
                            {participants.slice(0, 4).map((p) => {
                              const resolved = allUsers.find(
                                (u) =>
                                  u.name === p ||
                                  u.discord_username === p ||
                                  u.aliases?.includes(p),
                              );
                              return (
                                <UserAvatar
                                  key={p}
                                  name={resolved?.name ?? p}
                                  user={resolved}
                                  className="h-6 w-6 text-[8px] ring-2 ring-slate-800"
                                />
                              );
                            })}
                            {participants.length > 4 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-slate-800 bg-slate-700 text-[9px] font-bold text-slate-300">
                                +{participants.length - 4}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <DeleteConfirmActions
                        id={ev.id}
                        confirmId={confirmDeleteId}
                        isPending={deleteMutation.isPending}
                        onEdit={() => setDrawerId(ev.id)}
                        onRequestDelete={() => setConfirmDeleteId(ev.id)}
                        onConfirmDelete={() =>
                          handleDelete(ev.id, ev.event_name)
                        }
                        onCancelDelete={() => setConfirmDeleteId(null)}
                      />
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={currentPage}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </div>

      <EventDrawer
        key={drawerId ?? "none"}
        event={drawerEvent}
        days={drawerDays}
        onClose={() => { setDrawerId(null); setJustCreated(null); }}
        onCreated={(ev) => { setJustCreated(ev); setDrawerId(ev.id); }}
      />

      <AdminBulkBar
        count={selectedIds.size}
        isPending={bulkIsPending}
        onDelete={handleBulkDelete}
        onClear={handleClearSelection}
        extraActions={
          <button
            onClick={() => setBulkMode("set-group")}
            disabled={bulkIsPending}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-40"
          >
            <Tag size={14} />
            Label
          </button>
        }
        overrideContent={
          bulkMode === "set-group" ? (
            <>
              <select
                value={pickedGroup}
                onChange={(e) => setPickedGroup(e.target.value)}
                className="[color-scheme:dark] rounded-xl border border-white/[0.12] bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <option value="" className="bg-slate-800 text-white">— Geen groep —</option>
                {eventGroups.map((g) => (
                  <option key={g.id} value={g.name} className="bg-slate-800 text-white">{g.name}</option>
                ))}
              </select>
              <button
                onClick={() => { handleBulkSetGroup(pickedGroup || null); setPickedGroup(""); setBulkMode("idle"); }}
                disabled={bulkIsPending}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-40"
              >
                <Check size={14} />
                {bulkIsPending ? "Bezig…" : "Toepassen"}
              </button>
              <button
                onClick={() => { setBulkMode("idle"); setPickedGroup(""); }}
                disabled={bulkIsPending}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-white/[0.08] transition-colors"
              >
                Annuleer
              </button>
            </>
          ) : undefined
        }
      />
    </div>
  );
}
