import { forwardRef, useState } from "react";
import { BedDouble, Plus, Layers, Users, Pencil, Trash2, X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
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
import { NamePicker } from "../../components/common/NamePicker";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { toast } from "../../store/toast.store";
import { HotelInfoCard } from "../../components/event/HotelInfoCard";
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
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `${room?.room_number || "Kamer"} bewerken` : "Nieuwe kamer"}
      description={isEdit ? "Pas de kamerdetails aan" : "Voeg een hotelkamer toe aan dit evenement"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label mb-1.5 block">
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
            <label className="section-label mb-1.5 block">
              Capaciteit
            </label>
            <input
              type="number"
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
            <label className="section-label mb-1.5 block">
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
            <label className="section-label mb-1.5 block">
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
          <label className="section-label mb-1.5 block">
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

        <Button type="submit" loading={isPending} className="w-full">
          <BedDouble size={16} />
          {isEdit ? "Opslaan" : "Kamer aanmaken"}
        </Button>
      </form>
    </Modal>
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
    <Modal
      open={open}
      onClose={onClose}
      title="Kamers in bulk toevoegen"
      description="Bijv. 10 kamers voor 2 personen, 2 kamers voor 3 personen. Kamernummers vul je later in, als je inchecked."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2.5">
          {batches.map((batch, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="section-label mb-1.5 block">
                  Aantal kamers
                </label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  placeholder="10"
                  value={batch.count}
                  onChange={(e) => updateBatch(i, "count", e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="section-label mb-1.5 block">
                  Personen per kamer
                </label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  placeholder="2"
                  value={batch.capacity}
                  onChange={(e) => updateBatch(i, "capacity", e.target.value)}
                />
              </div>
              {batches.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBatch(i)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addBatch}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:underline"
        >
          <Plus size={13} />
          Nog een groep
        </button>

        <Button type="submit" loading={bulkCreate.isPending} className="w-full" disabled={totalRooms === 0}>
          <BedDouble size={16} />
          {totalRooms === 0 ? "Vul minstens één groep in" : `${totalRooms} ${totalRooms === 1 ? "kamer" : "kamers"} aanmaken`}
        </Button>
      </form>
    </Modal>
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
      className={`flex flex-col gap-3 rounded-[12px] bg-surface p-4 ${isMine ? "border-2 border-outline" : "border-1.5 border-line"}`}
    >
      {/* Header row: the room number, big */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {room.room_number ? (
            <span className="block font-display text-[34px] font-extrabold uppercase leading-[0.95] text-ink">
              {room.room_number}
            </span>
          ) : (
            <span className="block font-display text-[22px] font-extrabold uppercase leading-[0.95] text-ink-3">
              Nog geen nummer
            </span>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {room.floor && (
              <span className="inline-flex items-center rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                {room.floor}
              </span>
            )}
            <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] tabular-nums text-ink-3">
              {room.capacity != null
                ? `${room.occupants.length}/${room.capacity} bezet`
                : room.occupants.length === 0
                  ? "Leeg"
                  : `${room.occupants.length} ${room.occupants.length === 1 ? "persoon" : "personen"}`}
            </span>
            {isMine && (
              <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-brand-on">
                Jij
              </span>
            )}
            {isFull && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                Vol
              </span>
            )}
          </div>
        </div>

        {/* Admin action buttons */}
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(room)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
              title="Bewerken"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(room)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
              title="Verwijderen"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Occupants: names below the number */}
      {room.occupants.length > 0 && (
        <p className="text-[13px] leading-snug text-ink-2">
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
          <p className={`text-xs leading-relaxed text-ink-2 ${!expanded ? "line-clamp-2" : ""}`}>
            {room.instructions}
          </p>
          {room.instructions.length > 80 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-brand-text hover:underline"
            >
              {expanded ? <><ChevronUp size={11} /> Minder</> : <><ChevronDown size={11} /> Meer</>}
            </button>
          )}
        </div>
      )}

      {/* Self-assign / leave button */}
      {currentUserName && (
        <div className="mt-auto border-t border-dashed border-line pt-3">
          {isMine ? (
            <button
              type="button"
              onClick={handleSelfLeave}
              disabled={isPending}
              className="w-full rounded-xl border-1.5 border-line bg-surface py-2 text-xs font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10"
            >
              {isPending ? "Bezig…" : "Verlaat kamer"}
            </button>
          ) : isFull ? (
            <div className="w-full rounded-xl bg-sunken py-2 text-center text-xs font-semibold text-ink-3">
              Kamer is vol
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSelfAssign}
              disabled={isPending}
              className="w-full rounded-xl border-1.5 border-line bg-surface py-2 text-xs font-semibold text-ink transition-colors hover:border-ink-3 disabled:opacity-50"
            >
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
 * Event › Kamers. Rooms belong to the whole trip — the backend keys them by
 * the trip's multi-day group — so any hotel day's id reaches the same set.
 */
export function TripRoomsTab() {
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

  const userNames = users.map((u) => u.name);

  // Stats
  const assignedNames = new Set(rooms.flatMap((r) => r.occupants));
  const eventAttendees = trip.participants;
  const unassigned = tripRoomGaps(trip, rooms);
  const info = tripInfo(trip);

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
          <BedDouble size={22} />
        </span>
        <p className="text-sm font-semibold text-ink">Dit event heeft geen hotel</p>
      </div>
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

  return (
    <div className="pb-10">

      {/* ── Summary + actions ──────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[13px] text-ink-2">
          <BedDouble size={14} className="text-ink-3" />
          <b className="font-mono font-semibold tabular-nums text-ink">{rooms.length}</b> {rooms.length === 1 ? "kamer" : "kamers"}
        </span>
        <span className="ml-3 flex items-center gap-1.5 text-[13px] text-ink-2">
          <Users size={14} className="text-ink-3" />
          <b className="font-mono font-semibold tabular-nums text-ink">{assignedNames.size}</b> van <span className="font-mono tabular-nums">{eventAttendees.length}</span> ingedeeld
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setBulkModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border-1.5 border-line bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink-3"
        >
          <Layers size={14} />
          Bulk
        </button>
        <button
          type="button"
          onClick={() => setModalRoom("new")}
          className="btn-primary shrink-0 px-3 py-2 text-xs"
        >
          <Plus size={14} />
          Kamer
        </button>
      </div>

      <div className="space-y-5">

        {(info.hotel_location || info.hotel_info) && <HotelInfoCard event={info} />}

        {/* ── Unassigned strip ──────────────────────────────────────── */}
        {unassigned.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border-1.5 border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-500/25 dark:bg-amber-500/10">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-amber-800 dark:text-amber-300">
                {unassigned.length} {unassigned.length === 1 ? "deelnemer heeft" : "deelnemers hebben"} nog geen kamer
              </p>
              <div className="mt-1.5 flex -space-x-1.5">
                {unassigned.slice(0, 10).map((name) => {
                  const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
                  return (
                    <UserAvatar
                      key={name}
                      name={u?.name ?? name}
                      user={u}
                      className="h-6 w-6 text-[8px] !border-amber-50 dark:!border-[#241d0e]"
                    />
                  );
                })}
                {unassigned.length > 10 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-50 bg-amber-200 font-mono text-[8px] font-semibold text-amber-800 dark:border-[#241d0e] dark:bg-amber-500/25 dark:text-amber-200">
                    +{unassigned.length - 10}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Room grid ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface animate-pulse p-4">
                <div className="mb-2 h-8 w-16 rounded bg-sunken" />
                <div className="mb-4 h-3 w-24 rounded bg-sunken" />
                <div className="h-3 w-40 rounded bg-sunken" />
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
              <BedDouble size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Nog geen kamers aangemaakt</p>
              <p className="mt-1 text-xs text-ink-3">Maak de eerste kamer aan en wijs leden toe.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
              >
                <Layers size={16} />
                Kamers in bulk
              </button>
              <button
                type="button"
                onClick={() => setModalRoom("new")}
                className="btn-primary px-4 py-2.5 text-sm"
              >
                <Plus size={16} />
                Eerste kamer toevoegen
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3"
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

        {/* Delete confirm banner */}
        <AnimatePresence>
          {confirmDeleteId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-4 right-4 md:left-[calc(76px+2rem)] lg:left-[calc(15rem+2.5rem)] z-40 mx-auto flex max-w-lg items-center gap-3 rounded-xl
                         border-1.5 border-rose-300 bg-surface px-4 py-3.5 shadow-xl dark:border-rose-400/40"
            >
              <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="flex-1 text-sm font-semibold text-ink">
                Kamer verwijderen?
              </p>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              >
                Annuleer
              </button>
              <button
                onClick={() => {
                  const room = rooms.find((r) => r.id === confirmDeleteId);
                  if (room) handleDelete(room);
                }}
                disabled={deleteRoom.isPending}
                className="rounded-xl border-2 border-rose-800 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 dark:border-rose-400"
              >
                {deleteRoom.isPending ? "Bezig…" : "Verwijder"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                aria-label="Sluiten"
                className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
    </div>
  );
}
