import { forwardRef, useState } from "react";
import { BedDouble, Plus, Layers, Pencil, Trash2, X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useHotelRooms,
  useCreateHotelRoom,
  useBulkCreateHotelRooms,
  useAssignHotelRoom,
  useLeaveHotelRoom,
} from "../../hooks/useCalendar";
import { useAdminUpdateHotelRoom, useAdminDeleteHotelRoom } from "../../hooks/useAdmin";
import { useUsers, useCurrentUser } from "../../hooks/useUsers";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AvatarStack } from "../../components/common/AvatarStack";
import { EmptyState } from "../../components/common/EmptyState";
import { NamePicker } from "../../components/common/NamePicker";
import { TripSheet } from "../../components/trip/TripSheet";
import { Button } from "../../components/common/Button";
import { toast } from "../../store/toast.store";
import { HotelInfoCard, stayRange } from "../../components/event/HotelInfoCard";
import { tripInfo, tripRoomGaps } from "../../utils/trips";
import { useTrip } from "./tripContext";
import type { HotelRoom } from "../../types";

// ── Room form modal ────────────────────────────────────────────────────────────

interface RoomFormValues {
  room_number: string;
  floor: string;
  instructions: string;
  capacity: string;
  occupants: string[];
}

function RoomModal({
  open,
  onClose,
  room,
  eventId,
  userNames,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  room: HotelRoom | null; // null = create mode
  eventId: string;
  userNames: string[];
  isAdmin: boolean;
}) {
  const isEdit = room !== null;
  const createRoom = useCreateHotelRoom();
  const updateRoom = useAdminUpdateHotelRoom();

  const [values, setValues] = useState<RoomFormValues>({
    room_number: room?.room_number ?? "",
    floor: room?.floor ?? "",
    instructions: room?.instructions ?? "",
    capacity: room?.capacity != null ? String(room.capacity) : "",
    occupants: room?.occupants ?? [],
  });

  const isPending = createRoom.isPending || updateRoom.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const roomLabel = values.room_number.trim() || "Kamer";
    const capacity = values.capacity.trim() ? Number(values.capacity) : undefined;
    try {
      if (isEdit) {
        await updateRoom.mutateAsync({
          eventId,
          roomId: room.id,
          payload: {
            room_number: values.room_number.trim() || undefined,
            floor: values.floor.trim() || undefined,
            instructions: values.instructions.trim() || undefined,
            capacity,
            occupants: values.occupants,
          },
        });
        toast("success", `${roomLabel} bijgewerkt.`);
      } else {
        await createRoom.mutateAsync({
          eventId,
          payload: {
            room_number: values.room_number.trim() || undefined,
            floor: values.floor.trim() || undefined,
            instructions: values.instructions.trim() || undefined,
            capacity,
            occupants: values.occupants,
          },
        });
        toast("success", `${roomLabel} aangemaakt.`);
      }
      onClose();
    } catch {
      toast("error", "Kon kamer niet opslaan.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      stacked
      title={isEdit ? `${room?.room_number || "Kamer"} bewerken` : "Nieuwe kamer"}
      subtitle={isEdit ? "Pas de kamerdetails aan" : "Voeg een hotelkamer toe aan dit evenement"}
      footer={
        <Button type="submit" form="room-form" loading={isPending} className="w-full">
          <BedDouble size={16} />
          {isEdit ? "Opslaan" : "Kamer aanmaken"}
        </Button>
      }
    >
      <form id="room-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">
              Kamernummer
            </label>
            <input
              className="input-field"
              placeholder="101 (later invullen mag ook)"
              value={values.room_number}
              onChange={(e) => setValues((v) => ({ ...v, room_number: e.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">
              Capaciteit
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className="input-field"
              placeholder="bijv. 2"
              value={values.capacity}
              onChange={(e) => setValues((v) => ({ ...v, capacity: e.target.value }))}
            />
          </div>
        </div>

        {isAdmin && (
          <div>
            <label className="field-label">
              Verdieping
            </label>
            <input
              className="input-field"
              placeholder="2e verdieping"
              value={values.floor}
              onChange={(e) => setValues((v) => ({ ...v, floor: e.target.value }))}
            />
          </div>
        )}

        {isAdmin && (
          <div>
            <label className="field-label">
              Routebeschrijving / instructies
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Bijv. Neem lift A naar verdieping 3, dan links de gang in..."
              value={values.instructions}
              onChange={(e) => setValues((v) => ({ ...v, instructions: e.target.value }))}
            />
          </div>
        )}

        <div>
          <label className="field-label">
            Bewoners
          </label>
          <NamePicker
            multiple
            options={userNames}
            value={values.occupants}
            onChange={(names) => setValues((v) => ({ ...v, occupants: names }))}
            color="sky"
          />
        </div>
      </form>
    </TripSheet>
  );
}

// ── Bulk room creation modal ─────────────────────────────────────────────────

interface RoomBatchDraft {
  count: string;
  capacity: string;
}

function BulkRoomModal({
  open,
  onClose,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
}) {
  const bulkCreate = useBulkCreateHotelRooms();
  const [batches, setBatches] = useState<RoomBatchDraft[]>([{ count: "", capacity: "" }]);

  function updateBatch(index: number, field: keyof RoomBatchDraft, value: string) {
    setBatches((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addBatch() {
    setBatches((rows) => [...rows, { count: "", capacity: "" }]);
  }

  function removeBatch(index: number) {
    setBatches((rows) => rows.filter((_, i) => i !== index));
  }

  const payloadBatches = batches
    .map((b) => ({ count: Number(b.count), capacity: b.capacity.trim() ? Number(b.capacity) : undefined }))
    .filter((b) => b.count > 0);
  const totalRooms = payloadBatches.reduce((sum, b) => sum + b.count, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (payloadBatches.length === 0) return;
    try {
      await bulkCreate.mutateAsync({ eventId, payload: { batches: payloadBatches } });
      toast("success", `${totalRooms} ${totalRooms === 1 ? "kamer" : "kamers"} aangemaakt.`);
      setBatches([{ count: "", capacity: "" }]);
      onClose();
    } catch {
      toast("error", "Kon kamers niet aanmaken.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      stacked
      title="Meerdere kamers"
      subtitle="Maak er in één keer een stel aan"
      footer={
        <Button type="submit" form="bulk-room-form" loading={bulkCreate.isPending} className="w-full" disabled={totalRooms === 0}>
          <BedDouble size={16} />
          {totalRooms === 0 ? "Vul minstens één groep in" : `${totalRooms} ${totalRooms === 1 ? "kamer" : "kamers"} aanmaken`}
        </Button>
      }
    >
      <form id="bulk-room-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ink-3">
          Bijv. 10 kamers voor 2 personen, 2 kamers voor 3 personen. Kamernummers vul je later in, als je inchecked.
        </p>
        <div className="space-y-2.5">
          {batches.map((batch, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="field-label">
                  Aantal kamers
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="input-field"
                  placeholder="10"
                  value={batch.count}
                  onChange={(e) => updateBatch(i, "count", e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="field-label">
                  Personen per kamer
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="input-field"
                  placeholder="2"
                  value={batch.capacity}
                  onChange={(e) => updateBatch(i, "capacity", e.target.value)}
                />
              </div>
              {batches.length > 1 && (
                <button type="button" onClick={() => removeBatch(i)} aria-label={`Groep ${i + 1} verwijderen`} className="icon-btn mb-0.5">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addBatch}
          className="hit-area flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-text hover:underline"
        >
          <Plus size={14} />
          Nog een groep
        </button>
      </form>
    </TripSheet>
  );
}

// ── Room card ──────────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: HotelRoom;
  eventId: string;
  users: ReturnType<typeof useUsers>["data"] & {};
  currentUserName: string | undefined;
  isAdmin: boolean;
  onEdit: (room: HotelRoom) => void;
  onDelete: (room: HotelRoom) => void;
}

// forwardRef: the grid's <AnimatePresence mode="popLayout"> measures each card
// through a ref to animate it out when a room is removed.
const RoomCard = forwardRef<HTMLDivElement, RoomCardProps>(function RoomCard({
  room,
  eventId,
  users,
  currentUserName,
  isAdmin,
  onEdit,
  onDelete,
}, ref) {
  const [expanded, setExpanded] = useState(false);
  const assignRoom = useAssignHotelRoom();
  const leaveRoom = useLeaveHotelRoom();

  const isMine = !!currentUserName && room.occupants.includes(currentUserName);
  const isFull = room.capacity != null && room.occupants.length >= room.capacity;
  const resolveUser = (name: string) =>
    (users ?? []).find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));

  async function handleSelfAssign() {
    if (!currentUserName) return;
    try {
      await assignRoom.mutateAsync({ eventId, roomId: room.id, userNames: [currentUserName] });
    } catch {
      toast("error", "Kon je niet aanmelden voor deze kamer — mogelijk zit hij al vol.");
    }
  }

  async function handleSelfLeave() {
    if (!currentUserName) return;
    try {
      await leaveRoom.mutateAsync({ eventId, roomId: room.id, userName: currentUserName });
    } catch {
      toast("error", "Kon je niet afmelden van deze kamer.");
    }
  }

  const isPending = assignRoom.isPending || leaveRoom.isPending;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex min-w-0 flex-col gap-3 rounded-2xl bg-surface p-4 border-1.5 ${isMine ? "border-brand-text" : "border-line"}`}
    >
      {/* Header row: the room number, big */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {room.room_number ? (
            <span className="block break-words font-display text-[34px] font-extrabold uppercase leading-[0.95] text-ink">
              {room.room_number}
            </span>
          ) : (
            <span className="block font-display text-[22px] font-extrabold uppercase leading-[0.95] text-ink-3">
              Nog geen nummer
            </span>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {room.floor && <span className="tag">{room.floor}</span>}
            <span className="text-[12.5px] tabular-nums text-ink-3">
              {room.capacity != null
                ? `${room.occupants.length} van ${room.capacity} bezet`
                : room.occupants.length === 0
                  ? "Leeg"
                  : `${room.occupants.length} ${room.occupants.length === 1 ? "persoon" : "personen"}`}
            </span>
            {isMine && <span className="pill pill-neutral">Jij</span>}
          </div>
        </div>

        {/* Admin action buttons */}
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(room)}
              className="icon-btn"
              title="Bewerken"
              aria-label={`Kamer ${room.room_number ?? ""} bewerken`.replace("  ", " ")}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(room)}
              className="icon-btn"
              title="Verwijderen"
              aria-label={`Kamer ${room.room_number ?? ""} verwijderen`.replace("  ", " ")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Occupants: names below the number */}
      {room.occupants.length > 0 && (
        <p className="break-words text-[13px] leading-snug text-ink-2">
          {room.occupants.map((name, i) => {
            const displayName = resolveUser(name)?.name ?? name;
            return (
              <span key={name}>
                {i > 0 && ", "}
                <span className={name === currentUserName ? "font-semibold text-ink" : undefined}>{displayName}</span>
              </span>
            );
          })}
        </p>
      )}

      {/* Instructions */}
      {room.instructions && (
        <div className="rounded-lg bg-sunken px-3 py-2">
          <p className={`break-words text-xs leading-relaxed text-ink-2 ${!expanded ? "line-clamp-2" : ""}`}>
            {room.instructions}
          </p>
          {room.instructions.length > 80 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-0.5 flex items-center gap-0.5 text-[12px] font-semibold text-brand-text hover:underline"
            >
              {expanded ? <><ChevronUp size={11} /> Minder</> : <><ChevronDown size={11} /> Meer</>}
            </button>
          )}
        </div>
      )}

      {/* Self-assign / leave: a full room has nothing to offer. */}
      {currentUserName && (isMine || !isFull) && (
        <div className="mt-auto pt-1">
          {isMine ? (
            <button type="button" onClick={handleSelfLeave} disabled={isPending} className="btn-secondary w-full text-sm text-bad">
              {isPending ? "Bezig…" : "Verlaat kamer"}
            </button>
          ) : (
            <button type="button" onClick={handleSelfAssign} disabled={isPending} className="btn-secondary w-full text-sm">
              {isPending ? "Bezig…" : "Ik slaap hier"}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
});

// ── Page ───────────────────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

/**
 * Event › Hotel (the address, stay and rooms), opened as a bottom sheet over Overzicht. Rooms belong to
 * the whole trip — the backend keys them by the trip's multi-day group — so
 * any hotel day's id reaches the same set.
 */
export function TripRoomsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { trip } = useTrip();
  const event = trip.days.find((d) => d.ev.is_hotel)?.ev;
  const id = event?.id;

  const { data: rooms = [], isLoading } = useHotelRooms(id ?? "", { enabled: !!id });
  const { data: users = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();

  const isAdmin = currentUser?.is_admin ?? false;
  const currentUserName = currentUser?.name;

  const deleteRoom = useAdminDeleteHotelRoom();

  const [modalRoom, setModalRoom] = useState<HotelRoom | null | "new">(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [unassignedOpen, setUnassignedOpen] = useState(false);

  const userNames = users.map((u) => u.name);

  // Stats
  const assignedNames = new Set(rooms.flatMap((r) => r.occupants));
  const eventAttendees = trip.participants;
  const unassigned = tripRoomGaps(trip, rooms, users);
  const info = tripInfo(trip);

  if (!event) {
    return (
      <TripSheet open={open} onClose={onClose} title="Hotel">
        <EmptyState icon={<BedDouble size={22} />} title="Dit evenement heeft geen hotel" />
      </TripSheet>
    );
  }

  async function handleDelete(room: HotelRoom) {
    if (confirmDeleteId !== room.id) {
      setConfirmDeleteId(room.id);
      return;
    }
    try {
      await deleteRoom.mutateAsync({ eventId: id!, roomId: room.id });
      toast("success", `${room.room_number || "Kamer"} verwijderd.`);
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon kamer niet verwijderen.");
    }
  }

  // Delete confirmation replaces the sheet's footer instead of floating a
  // separate fixed banner — a fixed-position element would sit relative to
  // the sheet's own animated panel, not the viewport.
  const deleteConfirmFooter = confirmDeleteId ? (
    <div className="flex items-center gap-3">
      <AlertCircle size={16} className="shrink-0 text-bad" />
      <p className="flex-1 text-sm font-semibold text-ink">Kamer verwijderen?</p>
      <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
        Annuleren
      </Button>
      <Button
        size="sm"
        variant="danger"
        loading={deleteRoom.isPending}
        onClick={() => {
          const room = rooms.find((r) => r.id === confirmDeleteId);
          if (room) handleDelete(room);
        }}
      >
        Verwijderen
      </Button>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => setBulkModalOpen(true)} className="btn-secondary min-w-0 px-3 text-[13px]">
        <Layers size={16} className="shrink-0" />
        Meerdere
      </button>
      <Button onClick={() => setModalRoom("new")} className="min-w-0 px-3 text-[13px]">
        <Plus size={16} className="shrink-0" />
        Nieuwe kamer
      </Button>
    </div>
  );

  return (
    <TripSheet open={open} onClose={onClose} title="Hotel" subtitle={`${stayRange(trip)} · ${trip.title}`} footer={deleteConfirmFooter}>

      <div className="space-y-5">

        <HotelInfoCard event={info} trip={trip} />

        {/* The numbers first: how many rooms, how many people are in one. */}
        <p className="section-label">
          {rooms.length} {rooms.length === 1 ? "kamer" : "kamers"} · {assignedNames.size} van {eventAttendees.length} ingedeeld
        </p>

        {/* ── Room grid ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface animate-pulse p-4">
                <div className="mb-2 h-8 w-16 rounded-md bg-sunken" />
                <div className="mb-4 h-3 w-24 rounded-md bg-sunken" />
                <div className="h-3 w-40 rounded-md bg-sunken" />
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            compact
            icon={<BedDouble size={22} />}
            title="Nog geen kamers aangemaakt"
            description="Maak de eerste kamer aan en wijs leden toe."
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence mode="popLayout">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  eventId={id!}
                  users={users}
                  currentUserName={currentUserName}
                  isAdmin={isAdmin}
                  onEdit={(r) => setModalRoom(r)}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Unassigned strip ──────────────────────────────────────── */}
        {unassigned.length > 0 && (
          <div className="notice-warn">
            <button
              type="button"
              onClick={() => setUnassignedOpen((v) => !v)}
              aria-expanded={unassignedOpen}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight text-warn">
                  {unassigned.length} {unassigned.length === 1 ? "deelnemer heeft" : "deelnemers hebben"} nog geen kamer
                </p>
                {!unassignedOpen && (
                  <div className="mt-1.5">
                    <AvatarStack names={unassigned} size="sm" max={10} ringClass="!border-warn-soft" />
                  </div>
                )}
              </div>
              <ChevronDown
                size={16}
                className={`mt-0.5 shrink-0 text-warn transition-transform ${unassignedOpen ? "rotate-180" : ""}`}
              />
            </button>
            {unassignedOpen && (
              <ul className="space-y-2 border-t border-warn-line px-4 py-3">
                {unassigned.map((name) => {
                  const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
                  return (
                    <li key={name} className="flex items-center gap-2.5">
                      <UserAvatar name={u?.name ?? name} user={u} className="h-6 w-6 shrink-0 text-[8px] !border-0" />
                      <span className="truncate text-sm font-medium text-ink">{u?.name ?? name}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

      </div>

      {/* ── Create / Edit modal ─────────────────────────────────────── */}
      <RoomModal
        key={modalRoom === "new" ? "new" : (modalRoom !== null ? modalRoom.id : "closed")}
        open={modalRoom !== null}
        onClose={() => setModalRoom(null)}
        room={modalRoom === "new" ? null : (modalRoom ?? null)}
        eventId={id!}
        userNames={userNames}
        isAdmin={isAdmin}
      />

      {/* ── Bulk create modal ────────────────────────────────────────── */}
      <BulkRoomModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        eventId={id!}
      />
    </TripSheet>
  );
}
