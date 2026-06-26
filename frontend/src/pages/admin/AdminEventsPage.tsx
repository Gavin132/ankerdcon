import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, CalendarDays, Hotel, X as XIcon } from "lucide-react";
import type { TicketType, CalendarEvent } from "../../types";
import {
  useAdminEvents,
  useAdminUsers,
  useAdminCreateEvent,
  useAdminUpdateEvent,
  useAdminDeleteEvent,
  useAdminRemoveEventParticipant,
} from "../../hooks/useAdmin";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminDrawer } from "./AdminDrawer";
import { toast } from "../../store/toast.store";
import { routes } from "../../config/routes";
import { F, SECTION, SECTION_TITLE } from "./styles";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { ParticipantList } from "./components/ParticipantList";

const optStr = z.preprocess((v) => (v == null ? "" : v), z.string());
const optUrl = z.preprocess(
  (v) => (v == null ? "" : v),
  z.string().url("Voer een geldige URL in").or(z.literal("")),
);

const eventSchema = z.object({
  event_name: z.string().min(1, "Naam is verplicht"),
  date: z.string().min(1, "Datum is verplicht"),
  event_group_id: optStr,
  is_hotel: z.boolean().optional(),
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

// ── Event drawer ──────────────────────────────────────────────────────────────

function EventDrawer({
  event,
  onClose,
}: {
  event: CalendarEvent | "new" | null;
  onClose: () => void;
}) {
  const createMutation = useAdminCreateEvent();
  const updateMutation = useAdminUpdateEvent();
  const removeParticipant = useAdminRemoveEventParticipant();
  const isEdit = event !== null && event !== "new";
  const open = event !== null;

  // Ticket types list state
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(
    isEdit ? (event.ticket_types ?? []) : []
  );
  const [ttTitle, setTtTitle] = useState("");
  const [ttPrice, setTtPrice] = useState("");

  function addTicketType() {
    const price = parseFloat(ttPrice);
    if (!ttTitle.trim() || isNaN(price) || price < 0) return;
    setTicketTypes((prev) => [...prev, { title: ttTitle.trim(), price }]);
    setTtTitle("");
    setTtPrice("");
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      event_name: isEdit ? event.event_name : "",
      date: isEdit ? event.date : "",
      event_group_id: isEdit ? (event.event_group_id ?? "") : "",
      is_hotel: isEdit ? event.is_hotel : false,
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
    const cleaned = {
      ...values,
      website: values.website || undefined,
      ticket_url: values.ticket_url || undefined,
      ticket_types: ticketTypes,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: event.id, ...cleaned });
        toast("success", "Evenement bijgewerkt.");
      } else {
        await createMutation.mutateAsync(cleaned);
        toast("success", `${values.event_name} aangemaakt.`);
      }
      onClose();
    } catch {
      toast("error", "Kon evenement niet opslaan.");
    }
  }

  async function handleRemove(p: string) {
    if (!isEdit) return;
    try {
      await removeParticipant.mutateAsync({
        eventId: event.id,
        participant: p,
      });
      toast("success", `${p} verwijderd.`);
    } catch {
      toast("error", "Kon deelnemer niet verwijderen.");
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Evenement bewerken" : "Nieuw evenement"}
      subtitle={
        isEdit
          ? `${event.event_name} · ${event.date}`
          : "Voeg een kalender item toe"
      }
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
            <input {...register("event_name")} className={F} placeholder="Comic Con — dag 1" />
            {errors.event_name && (
              <p className="text-xs text-rose-400 mt-1">{errors.event_name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Datum *</label>
              <input {...register("date")} type="date" className={F} />
              {errors.date && (
                <p className="text-xs text-rose-400 mt-1">{errors.date.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Groep ID</label>
              <input {...register("event_group_id")} className={F} placeholder="Comic Con" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition-colors">
            <input type="checkbox" {...register("is_hotel")} className="h-4 w-4 rounded accent-sky-500" />
            <span className="text-sm text-slate-300">Hotel beschikbaar</span>
          </label>
        </div>

        {/* ── Beschrijving & Locatie ────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Details</p>
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
            <input {...register("location")} className={F} placeholder="Biddinghuizen" />
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
              className={F}
            />
          </div>

          {/* Ticket types list builder */}
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

        {isEdit && (
          <ParticipantList
            participants={event.participants}
            onRemove={handleRemove}
            isPending={removeParticipant.isPending}
          />
        )}
      </form>
    </AdminDrawer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminEventsPage() {
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useAdminEvents();
  const { data: allUsers = [] } = useAdminUsers();
  const deleteMutation = useAdminDeleteEvent();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<CalendarEvent | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = events.filter((ev) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ev.event_name.toLowerCase().includes(q) ||
      (ev.event_group_id ?? "").toLowerCase().includes(q) ||
      ev.date.includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
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
        subtitle={`${events.length} kalender items`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nieuw evenement
          </button>
        }
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam, groep of datum..."
      />

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Evenement
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Datum
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Type
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
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    Geen evenementen gevonden.
                  </td>
                </tr>
              ) : (
                paginated.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => navigate(routes.event.view(event.id))}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10">
                          <CalendarDays size={13} className="text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {event.event_name}
                          </p>
                          {event.event_group_id && (
                            <p className="text-xs text-slate-400 font-mono">
                              {event.event_group_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        {event.date}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {event.is_hotel ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                          <Hotel size={10} />
                          Hotel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Dag
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex -space-x-1.5">
                        {event.participants.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <>
                            {event.participants.slice(0, 4).map((p) => {
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
                            {event.participants.length > 4 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-slate-800 bg-slate-700 text-[9px] font-bold text-slate-300">
                                +{event.participants.length - 4}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <DeleteConfirmActions
                        id={event.id}
                        confirmId={confirmDeleteId}
                        isPending={deleteMutation.isPending}
                        onEdit={() => setDrawer(event)}
                        onRequestDelete={() => setConfirmDeleteId(event.id)}
                        onConfirmDelete={() =>
                          handleDelete(event.id, event.event_name)
                        }
                        onCancelDelete={() => setConfirmDeleteId(null)}
                      />
                    </td>
                  </tr>
                ))
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
        key={
          typeof drawer === "object" && drawer !== null
            ? drawer.id
            : (drawer ?? "none")
        }
        event={drawer}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
