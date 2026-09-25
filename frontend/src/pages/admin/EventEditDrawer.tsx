import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  CalendarDays,
  X as XIcon,
  Upload,
  Link2,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Trash2,
} from "lucide-react";
import type { TicketType, Event, EventDay } from "../../types";
import {
  useAdminCreateEvent,
  useAdminUpdateEvent,
  useAdminCreateEventDay,
  useAdminUpdateEventDay,
  useAdminDeleteEventDay,
  useAdminRemoveEventParticipant,
  useAdminEventGroups,
} from "../../hooks/useAdmin";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminDrawer } from "./AdminDrawer";
import { toast } from "../../store/toast.store";
import { F, SECTION, SECTION_TITLE } from "./styles";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { uploadEventCoverImage } from "../../services/storage.service";
import { DrawerFooter } from "./components/DrawerFooter";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
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
  is_party: z.boolean().optional(),
  hotel_location: optStr,
  hotel_info: optStr,
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
      <p className="text-xs text-ink-3 -mt-1">
        Vink "Con" uit voor een dag die alleen reizen/hotel is, zonder convention die dag.
      </p>

      <div className="space-y-2">
        {sorted.map((day) => {
          const isExpanded = expandedDay === day.id;
          return (
            <div key={day.id} className="overflow-hidden rounded-xl border border-line bg-paper">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <CalendarDays size={14} className="text-ink-3 shrink-0" />
                <span className="flex-1 font-mono text-[13px] font-semibold text-ink">
                  {formatDate(day.date)}
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-ink-3 cursor-pointer whitespace-nowrap">
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
                  className="flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink transition-colors whitespace-nowrap"
                >
                  <UserPlus size={12} />
                  {day.participants.length}
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDay(day)}
                  disabled={deleteDay.isPending}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {isExpanded && (
                <div className="border-t border-line px-3 py-2.5 space-y-1.5">
                  {day.participants.length === 0 ? (
                    <p className="text-xs text-ink-3">Nog geen aanmeldingen.</p>
                  ) : (
                    day.participants.map((p) => (
                      <div key={p} className="flex items-center gap-2 rounded-lg bg-sunken px-2.5 py-1.5">
                        <UserAvatar name={p} className="h-5 w-5 text-[7px]" />
                        <span className="flex-1 text-xs text-ink-2">{p}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(day.id, p)}
                          disabled={removeParticipant.isPending}
                          className="text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-40"
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
          <label className="mb-1 block text-xs font-medium text-ink-2">Nieuwe dag</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={F}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink-3 pb-2.5 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={newHasCon} onChange={(e) => setNewHasCon(e.target.checked)} className="cb" />
          Con
        </label>
        <button
          type="button"
          onClick={handleAddDay}
          disabled={!newDate || createDay.isPending}
          className="btn-primary h-10 shrink-0 gap-1.5 px-3 text-sm disabled:opacity-50"
        >
          <Plus size={14} />
          Toevoegen
        </button>
      </div>
    </div>
  );
}

// ── Event drawer ──────────────────────────────────────────────────────────────

export function EventEditDrawer({
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

  const initialTicketTypes = useRef<TicketType[]>(isEdit ? (event.ticket_types ?? []) : []);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(initialTicketTypes.current);
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
    formState: { errors, isDirty },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      event_name: isEdit ? event.event_name : "",
      event_group_id: isEdit ? (event.event_group_id ?? "") : "",
      is_hotel: isEdit ? event.is_hotel : false,
      is_party: isEdit ? event.is_party : false,
      hotel_location: isEdit ? (event.hotel_location ?? "") : "",
      hotel_info: isEdit ? (event.hotel_info ?? "") : "",
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
    // Explicit `null` (not `undefined`) for a cleared field: `undefined` gets
    // dropped entirely by JSON.stringify, so the backend never even sees the
    // key and leaves the existing value untouched on update.
    const strip = (v: string | undefined) => v || null;
    const cleaned = {
      event_name: values.event_name,
      is_hotel: values.is_hotel,
      is_party: values.is_party,
      hotel_location: strip(values.hotel_location),
      hotel_info: strip(values.hotel_info),
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
  const ticketTypesDirty = JSON.stringify(ticketTypes) !== JSON.stringify(initialTicketTypes.current);
  const { requestClose, confirming, confirmDiscard, cancelDiscard } =
    useConfirmDiscard(isDirty || ticketTypesDirty, onClose);

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
    <>
    <AdminDrawer
      open={open}
      onClose={requestClose}
      title={isEdit ? "Evenement bewerken" : "Nieuw evenement"}
      subtitle={isEdit ? event.event_name : "Maak eerst het evenement aan, voeg daarna de dagen toe"}
      footer={
        <DrawerFooter
          onCancel={requestClose}
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
            <label className="mb-1 block text-xs font-medium text-ink-2">Naam *</label>
            <input {...register("event_name")} className={F} placeholder="DoKomi 2027" />
            {errors.event_name && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.event_name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Groep</label>
            <select {...register("event_group_id")} className={F}>
              <option value="">— Geen groep —</option>
              {eventGroups.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-line bg-paper px-3 py-2.5 hover:bg-sunken transition-colors">
            <input type="checkbox" {...register("is_hotel")} className="cb" />
            <span className="text-sm text-ink-2">Hotel beschikbaar</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-line bg-paper px-3 py-2.5 hover:bg-sunken transition-colors">
            <input type="checkbox" {...register("is_party")} className="cb" />
            <span className="text-sm text-ink-2">Feestje / gezellig samenzijn</span>
          </label>
          {watch("is_hotel") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Hotellocatie</label>
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
              <p className="mt-1 text-xs text-ink-3">
                Gebruikt voor de snelle "rit naar hotel"-knop op het hoofdscherm.
              </p>
            </div>
          )}
          {watch("is_hotel") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Hotel info</label>
              <textarea
                {...register("hotel_info")}
                rows={3}
                className={`${F} resize-none`}
                placeholder="Bijv. inchecktijd vanaf 15:00, code voor de kluisjes, ontbijt inbegrepen..."
              />
              <p className="mt-1 text-xs text-ink-3">
                Verschijnt op de hoofdpagina van het evenement, bij "Hotel &amp; overnachting".
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
            <p className="text-xs text-ink-3">
              Sla het evenement eerst op — daarna kun je hier de dagen toevoegen.
            </p>
          </div>
        )}

        {/* ── Beschrijving & Locatie ────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Details</p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-ink-2">Cover afbeelding</label>
              <button
                type="button"
                onClick={() => setImageUrlMode((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-ink-3 hover:text-brand-text transition-colors"
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
                      ? "border-brand-text bg-brand-soft"
                      : "border-line bg-paper hover:border-ink-3 hover:bg-sunken"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {imageUploading ? (
                    <p className="text-xs text-ink-3">Uploaden...</p>
                  ) : (
                    <>
                      <Upload size={18} className="mx-auto mb-1.5 text-ink-3" />
                      <p className="text-xs font-medium text-ink-3">Klik of sleep een afbeelding hierheen</p>
                      <p className="text-[10px] text-ink-3 mt-0.5">PNG, JPG, WebP · liggend formaat aanbevolen</p>
                    </>
                  )}
                </button>
              </>
            )}

            {errors.image_url && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.image_url.message}</p>
            )}

            {currentImageUrl && (
              <div className="mt-2 relative rounded-xl overflow-hidden border border-line">
                <img src={currentImageUrl} alt="preview" className="w-full h-28 object-cover" />
                <button
                  type="button"
                  onClick={() => setValue("image_url", "", { shouldValidate: true })}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-[#0F1519]/70 p-1 text-white transition-colors hover:bg-[#0F1519]"
                >
                  <XIcon size={12} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Beschrijving</label>
            <textarea
              {...register("description")}
              rows={3}
              className={`${F} resize-none`}
              placeholder="Korte beschrijving van het evenement..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Locatie</label>
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
              <label className="mb-1 block text-xs font-medium text-ink-2">Website</label>
              <input {...register("website")} className={F} placeholder="https://..." />
              {errors.website && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.website.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Tickets URL</label>
              <input {...register("ticket_url")} className={F} placeholder="https://..." />
              {errors.ticket_url && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.ticket_url.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Ticketverkoop start</label>
            <input
              {...register("ticket_sale_start")}
              type="datetime-local"
              className={F}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-ink-2">Ticket soorten</label>
            {ticketTypes.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {ticketTypes.map((tt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-line bg-sunken px-3 py-2.5"
                  >
                    <span className="flex-1 text-sm font-medium text-ink">{tt.title}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                      € {tt.price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTicketTypes((p) => p.filter((_, idx) => idx !== i))}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors"
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
                className="input-field min-w-0 flex-1 rounded-[9px] px-3 py-2.5 text-base sm:text-sm"
                placeholder="Dagticket"
              />
              <div className="relative w-28 shrink-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">
                  €
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={ttPrice}
                  onChange={(e) => setTtPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTicketType())}
                  className="input-field rounded-[9px] py-2.5 pl-7 pr-3 text-base sm:text-sm"
                  placeholder="89.50"
                />
              </div>
              <button
                type="button"
                onClick={addTicketType}
                disabled={!ttTitle.trim() || !ttPrice}
                className="btn-primary h-10 w-10 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={15} />
              </button>
            </div>
            {ticketTypes.length === 0 && (
              <p className="mt-1.5 text-xs text-ink-3">Nog geen ticket soorten toegevoegd.</p>
            )}
          </div>
        </div>

        {/* ── Praktisch ────────────────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Praktische info</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Parkeerinformatie</label>
            <textarea
              {...register("parking_info")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Parkeerplaats P1, bereikbaar via afslag 5..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Speciale instructies</label>
            <textarea
              {...register("special_instructions")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Neem afslag 5 voor de snelste route..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Wat meenemen</label>
            <textarea
              {...register("what_to_bring")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="ID, tickets, poncho, zonnebrandcrème..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Locker info</label>
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
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
  );
}
