import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays, Hotel, Tag, Check, History, PartyPopper } from "lucide-react";
import type { Event, EventDay } from "../../types";
import {
  useAdminEvents,
  useAdminEventDays,
  useAdminUsers,
  useAdminDeleteEvent,
  useAdminEventGroups,
  useAdminBulkDeleteEvents,
  useAdminBulkSetEventGroup,
} from "../../hooks/useAdmin";
import { UserAvatar } from "../../components/common/UserAvatar";
import { EventEditDrawer } from "./EventEditDrawer";
import { toast } from "../../store/toast.store";
import { routes } from "../../config/routes";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { useTableSelection } from "../../hooks/useTableSelection";
import { formatDate } from "../../utils/format";
import { parseEventDate } from "../../utils/date";

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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Evenementen"
        subtitle={`${filtered.length} ${showHistory ? "historische" : "aankomende"} items`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowHistory((v) => !v); setPage(0); clearSelection(); }}
              className={`flex items-center gap-2 rounded-xl border-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                showHistory
                  ? "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                  : "border-line bg-surface text-ink hover:border-ink-3"
              }`}
            >
              <History size={16} />
              {showHistory ? "Terug naar aankomend" : "Geschiedenis"}
            </button>
            <button
              onClick={() => setDrawerId("new")}
              className="btn-primary gap-2 px-4 py-2.5 text-sm"
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
              className={`shrink-0 rounded-full border-1.5 px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                groupFilter === "All"
                  ? "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                  : "border-line bg-surface text-ink-2 hover:border-ink-3"
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
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border-1.5 px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                      : "border-line bg-surface text-ink-2 hover:border-ink-3"
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

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-1.5 border-line">
                <th className="w-8 sm:w-10 pl-2.5 sm:pl-4 pr-1.5 sm:pr-2 py-2.5 sm:py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                    onChange={selectAll}
                    className="cb"
                  />
                </th>
                <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Evenement
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Data
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Info
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Deelnemers
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-ink-3"
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
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-brand-soft/50 hover:bg-brand-soft/70" : "hover:bg-sunken"}`}
                  >
                    <td
                      className="w-8 sm:w-10 pl-2.5 sm:pl-4 pr-1.5 sm:pr-2 py-2.5 sm:py-3.5"
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
                    <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink sm:h-7 sm:w-7">
                          <CalendarDays size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">
                            {ev.event_name}
                          </p>
                          {ev.event_group_id && (
                            <span className="mt-0.5 inline-flex items-center rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                              {ev.event_group_id}
                            </span>
                          )}
                          {/* Dates — visible on mobile only, where the Data column is hidden */}
                          <p className="mt-0.5 whitespace-nowrap font-mono text-xs text-ink-3 sm:hidden">
                            {!first ? "—" : !last || first.getTime() === last.getTime()
                              ? formatDate(evDays[0]?.date ?? "")
                              : `${formatDate(evDays.find((d) => parseEventDate(d.date)?.getTime() === first.getTime())?.date ?? "")} – ${formatDate(evDays.find((d) => parseEventDate(d.date)?.getTime() === last.getTime())?.date ?? "")}`
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5">
                      <span className="whitespace-nowrap font-mono text-[12.5px] text-ink-2">
                        {!first ? "—" : !last || first.getTime() === last.getTime()
                          ? formatDate(evDays[0]?.date ?? "")
                          : `${formatDate(evDays.find((d) => parseEventDate(d.date)?.getTime() === first.getTime())?.date ?? "")} – ${formatDate(evDays.find((d) => parseEventDate(d.date)?.getTime() === last.getTime())?.date ?? "")}`
                        }
                      </span>
                    </td>
                    <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ev.is_hotel && (
                          <span
                            title="Hotel"
                            className="inline-flex items-center gap-1.5 rounded-full bg-sunken p-1.5 text-[11.5px] font-semibold text-ink-2 sm:px-2 sm:py-0.5"
                          >
                            <Hotel size={10} />
                            <span className="hidden sm:inline">Hotel</span>
                          </span>
                        )}
                        {ev.is_party && (
                          <span
                            title="Feestje"
                            className="inline-flex items-center gap-1.5 rounded-full bg-sunken p-1.5 text-[11.5px] font-semibold text-ink-2 sm:px-2 sm:py-0.5"
                          >
                            <PartyPopper size={10} />
                            <span className="hidden sm:inline">Feestje</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                          {evDays.length} {evDays.length === 1 ? "dag" : "dagen"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                      <div className="flex -space-x-1.5">
                        {participants.length === 0 ? (
                          <span className="text-xs text-ink-3">—</span>
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
                                  className="h-5 w-5 sm:h-6 sm:w-6 text-[7px] sm:text-[8px] ring-2 ring-surface"
                                />
                              );
                            })}
                            {participants.length > 4 && (
                              <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full ring-2 ring-surface bg-sunken text-[8px] sm:text-[9px] font-bold text-ink-2">
                                +{participants.length - 4}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-5 py-2.5 sm:py-3.5" onClick={(e) => e.stopPropagation()}>
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

      <EventEditDrawer
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
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
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
                className="input-field w-auto rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">— Geen groep —</option>
                {eventGroups.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
              <button
                onClick={() => { handleBulkSetGroup(pickedGroup || null); setPickedGroup(""); setBulkMode("idle"); }}
                disabled={bulkIsPending}
                className="btn-primary gap-1.5 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <Check size={14} />
                {bulkIsPending ? "Bezig…" : "Toepassen"}
              </button>
              <button
                onClick={() => { setBulkMode("idle"); setPickedGroup(""); }}
                disabled={bulkIsPending}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
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
