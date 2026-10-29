import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, CalendarDays, Hotel, Tag, Check, Eye, Music2, PartyPopper, Ticket } from "lucide-react";
import type { Event, EventDay } from "../../types";
import {
  useAdminEvents,
  useAdminEventDays,
  useAdminDeleteEvent,
  useAdminEventGroups,
  useAdminBulkDeleteEvents,
  useAdminBulkSetEventGroup,
} from "../../hooks/useAdmin";
import { AvatarStack } from "../../components/common/AvatarStack";
import { Segmented } from "../../components/common/Segmented";
import { EventEditDrawer } from "./EventEditDrawer";
import { toast } from "../../store/toast.store";
import { routes } from "../../config/routes";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { TH, TD, TR, TR_SELECTED, PILL_NEUTRAL } from "./styles";
import { EVENT_TYPE_LABEL } from "./constants";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { RowCheckbox } from "./components/RowCheckbox";
import { useTableSelection } from "../../hooks/useTableSelection";
import { formatDateRangeShort } from "../../utils/format";
import { parseEventDate } from "../../utils/date";
import { getNow } from "../../store/time.store";

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

/** Hotel and the kind of event, as pills. */
function EventKinds({ ev }: { ev: Event }) {
  return (
    <>
      {ev.is_hotel && (
        <span className={PILL_NEUTRAL}>
          <Hotel size={14} />
          Hotel
        </span>
      )}
      {ev.event_type && (
        <span className={PILL_NEUTRAL}>
          {ev.event_type === "con" && <Ticket size={14} />}
          {ev.event_type === "gathering" && <PartyPopper size={14} />}
          {ev.event_type === "concert" && <Music2 size={14} />}
          {EVENT_TYPE_LABEL[ev.event_type]}
        </span>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminEventsPage() {
  const { data: events = [], isLoading: eventsLoading } = useAdminEvents();
  const { data: days = [], isLoading: daysLoading } = useAdminEventDays();
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

  const today = new Date(getNow());
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
      toast("success", `Groep bijgewerkt voor ${ids.length} ${ids.length === 1 ? "evenement" : "evenementen"}.`);
      clearSelection();
    } catch {
      toast("error", "Kon de groep niet instellen. Probeer het opnieuw.");
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
    <AdminPage>
      <AdminPageHeader
        title="Evenementen"
        subtitle={`${filtered.length} ${filtered.length === 1 ? "evenement" : "evenementen"} · ${showHistory ? "geschiedenis" : "aankomend"}`}
        action={
          <button
            onClick={() => setDrawerId("new")}
            className="btn-primary min-h-[44px] gap-2 px-4 py-2.5 text-sm"
          >
            <Plus size={16} />
            Nieuw evenement
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label="Periode"
          value={showHistory ? "history" : "upcoming"}
          onChange={(v) => { setShowHistory(v === "history"); setPage(0); clearSelection(); }}
          options={[
            { value: "upcoming", label: "Aankomend" },
            { value: "history", label: "Geschiedenis" },
          ]}
        />
        {eventGroups.length > 0 && (
          <div className="flex gap-2 overflow-x-auto sm:min-w-0">
            <button
              onClick={() => { setGroupFilter("All"); setPage(0); }}
              className={`chip ${groupFilter === "All" ? "chip-on" : "chip-off"}`}
            >
              Alle groepen
            </button>
            {eventGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => { setGroupFilter(g.name); setPage(0); }}
                className={`chip ${groupFilter === g.name ? "chip-on" : "chip-off"}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam of groep…"
      />

      <AdminBulkBar
        itemsLabel="evenementen"
        count={selectedIds.size}
        isPending={bulkIsPending}
        onDelete={handleBulkDelete}
        onClear={handleClearSelection}
        extraActions={
          <button
            onClick={() => setBulkMode("set-group")}
            disabled={bulkIsPending}
            className="btn-secondary px-3 text-sm"
          >
            <Tag size={16} />
            Groep
          </button>
        }
        overrideContent={
          bulkMode === "set-group" ? (
            <>
              <select
                value={pickedGroup}
                onChange={(e) => setPickedGroup(e.target.value)}
                className="input-field w-full rounded-lg px-3 py-2.5 sm:w-auto"
              >
                <option value="">— Geen groep —</option>
                {eventGroups.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
              <button
                onClick={() => { handleBulkSetGroup(pickedGroup || null); setPickedGroup(""); setBulkMode("idle"); }}
                disabled={bulkIsPending}
                className="btn-primary min-h-[44px] gap-1.5 px-3 py-1.5 text-sm"
              >
                <Check size={16} />
                {bulkIsPending ? "Bezig…" : "Toepassen"}
              </button>
              <button
                onClick={() => { setBulkMode("idle"); setPickedGroup(""); }}
                disabled={bulkIsPending}
                className="btn-secondary px-3 text-sm"
              >
                Annuleren
              </button>
            </>
          ) : undefined
        }
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-table w-full">
            <thead>
              <tr>
                <th className={`${TH} w-10 !pr-2`}>
                  <RowCheckbox checked={allSelected} indeterminate={indeterminate} onChange={selectAll} label="Alles selecteren" />
                </th>
                <th className={TH}>Evenement</th>
                <th className={`${TH} hidden sm:table-cell`}>Data</th>
                <th className={`${TH} hidden sm:table-cell`}>Soort</th>
                <th className={`${TH} hidden sm:table-cell`}>Deelnemers</th>
                <th className={`${TH} text-right`}>Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-3">
                    {showHistory ? "Geen evenementen in de geschiedenis." : "Geen aankomende evenementen gevonden."}
                  </td>
                </tr>
              ) : (
                paginated.map(({ ev, days: evDays, first, last, participants }) => {
                  const isSelected = selectedIds.has(ev.id);
                  const dateLabel = first && last ? formatDateRangeShort(first, last) : "—";
                  const dayCount = `${evDays.length} ${evDays.length === 1 ? "dag" : "dagen"}`;
                  return (
                    <tr key={ev.id} className={isSelected ? TR_SELECTED : TR}>
                      <td className={`${TD} w-10 !pr-2`} onClick={(e) => { e.stopPropagation(); toggleSelect(ev.id); }}>
                        <RowCheckbox checked={isSelected} onChange={() => toggleSelect(ev.id)} label={`Selecteer ${ev.event_name}`} />
                      </td>
                      <td className={`cell-main ${TD}`}>
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink sm:flex">
                            <CalendarDays size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{ev.event_name}</p>
                            {ev.event_group_id && <span className="tag mt-0.5">{ev.event_group_id}</span>}
                            {/* On a phone the other columns are hidden; the row is these lines. */}
                            <p className="mt-0.5 text-xs text-ink-3 sm:hidden">{dateLabel} · {dayCount}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5 sm:hidden">
                              <EventKinds ev={ev} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <p className="whitespace-nowrap text-sm text-ink-2">{dateLabel}</p>
                        <p className="text-xs text-ink-3">{dayCount}</p>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <EventKinds ev={ev} />
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        {participants.length === 0 ? (
                          <span className="text-xs text-ink-3">—</span>
                        ) : (
                          <AvatarStack names={participants} size="sm" max={4} />
                        )}
                      </td>
                      <td className={`cell-actions ${TD}`}>
                        <DeleteConfirmActions
                          id={ev.id}
                          confirmId={confirmDeleteId}
                          isPending={deleteMutation.isPending}
                          before={
                            evDays[0] && (
                              <Link
                                to={routes.event.view(evDays[0].id)}
                                className="icon-btn text-ink-3"
                                aria-label={`${ev.event_name} bekijken in de app`}
                                title="Bekijken in de app"
                              >
                                <Eye size={16} />
                              </Link>
                            )
                          }
                          onEdit={() => setDrawerId(ev.id)}
                          onRequestDelete={() => setConfirmDeleteId(ev.id)}
                          onConfirmDelete={() => handleDelete(ev.id, ev.event_name)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                          editLabel={`${ev.event_name} bewerken`}
                          deleteLabel={`${ev.event_name} verwijderen`}
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
    </AdminPage>
  );
}
