import { useState } from "react";
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
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
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
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
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
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
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500 transition-colors"
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
          className="flex items-center gap-1.5 text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors"
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

function RoomCard({
  room,
  eventId,
  users,
  currentUserName,
  isAdmin,
  onEdit,
  onDelete,
}: {
  room: HotelRoom;
  eventId: string;
  users: ReturnType<typeof useUsers>["data"] & {};
  currentUserName: string | undefined;
  isAdmin: boolean;
  onEdit: (room: HotelRoom) => void;
  onDelete: (room: HotelRoom) => void;
}) {
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
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`card-surface rounded-2xl overflow-hidden transition-shadow ${isMine ? "ring-2 ring-sky-500/40" : ""}`}
    >
      {/* Accent bar */}
      <div className={`h-1 ${isMine ? "bg-gradient-to-r from-sky-400 to-indigo-500" : "bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600"}`} />

      <div className="px-4 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-2xl font-black leading-none ${room.room_number ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {room.room_number || "Nog geen nummer"}
              </span>
              {room.floor && (
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {room.floor}
                </span>
              )}
              {isMine && (
                <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                  Jij
                </span>
              )}
              {isFull && (
                <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Vol
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {room.capacity != null
                ? `${room.occupants.length}/${room.capacity} bezet`
                : room.occupants.length === 0
                  ? "Leeg"
                  : `${room.occupants.length} ${room.occupants.length === 1 ? "persoon" : "personen"}`}
            </p>
          </div>

          {/* Admin action buttons */}
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(room)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="Bewerken"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(room)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                title="Verwijderen"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        {room.instructions && (
          <div className="mb-3">
            <p className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
              {room.instructions}
            </p>
            {room.instructions.length > 80 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold text-sky-500 hover:text-sky-600 transition-colors"
              >
                {expanded ? <><ChevronUp size={10} /> Minder</> : <><ChevronDown size={10} /> Meer</>}
              </button>
            )}
          </div>
        )}

        {/* Occupants */}
        {room.occupants.length > 0 && (
          <div className="mb-3">
            <div className="flex -space-x-1.5 mb-1.5">
              {room.occupants.slice(0, 8).map((name) => {
                const u = resolveUser(name);
                return (
                  <UserAvatar
                    key={name}
                    name={u?.name ?? name}
                    user={u}
                    className="h-7 w-7 text-[9px] ring-2 ring-white dark:ring-slate-900"
                  />
                );
              })}
              {room.occupants.length > 8 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                  +{room.occupants.length - 8}
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              {room.occupants.slice(0, 3).join(", ")}
              {room.occupants.length > 3 && ` +${room.occupants.length - 3}`}
            </p>
          </div>
        )}

        {/* Self-assign / leave button */}
        {currentUserName && (
          isMine ? (
            <button
              onClick={handleSelfLeave}
              disabled={isPending}
              className="w-full rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10
                         py-2 text-xs font-semibold text-rose-600 dark:text-rose-400
                         hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
              {isPending ? "Bezig…" : "Verlaat kamer"}
            </button>
          ) : isFull ? (
            <div className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-center text-xs font-semibold text-slate-400">
              Kamer is vol
            </div>
          ) : (
            <button
              onClick={handleSelfAssign}
              disabled={isPending}
              className="w-full rounded-xl bg-sky-500 py-2 text-xs font-semibold text-white
                         hover:bg-sky-600 active:bg-sky-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Bezig…" : "Ik slaap hier"}
            </button>
          )
        )}
      </div>
    </motion.div>
  );
}

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
  const unassigned = eventAttendees.filter((p) => !assignedNames.has(p));

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-400">
        <BedDouble size={40} className="opacity-30" />
        <p className="text-sm">Dit event heeft geen hotel</p>
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
        <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <BedDouble size={12} />
          {rooms.length} {rooms.length === 1 ? "kamer" : "kamers"}
        </span>
        <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Users size={12} />
          {assignedNames.size} van {eventAttendees.length} ingedeeld
        </span>
        <span className="flex-1" />
        <button
          onClick={() => setBulkModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300
                     hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <Layers size={14} />
          Bulk
        </button>
        <button
          onClick={() => setModalRoom("new")}
          className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white
                     hover:bg-sky-600 active:bg-sky-700 transition-colors shrink-0"
        >
          <Plus size={14} />
          Kamer
        </button>
      </div>

      <div className="space-y-5">

        {/* ── Unassigned strip ──────────────────────────────────────── */}
        {unassigned.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-4 py-3.5">
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 leading-tight">
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
                      className="h-6 w-6 text-[8px] ring-2 ring-white dark:ring-slate-900"
                    />
                  );
                })}
                {unassigned.length > 10 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 bg-amber-200 dark:bg-amber-700 text-[8px] font-bold text-amber-800 dark:text-amber-200">
                    +{unassigned.length - 10}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Room grid ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface rounded-2xl p-4 animate-pulse">
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                <div className="flex -space-x-1">
                  {[0, 1, 2].map((j) => <div key={j} className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700" />)}
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <BedDouble size={40} className="text-slate-300 dark:text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nog geen kamers aangemaakt</p>
              <p className="text-xs text-slate-400 mt-1">Maak de eerste kamer aan en wijs leden toe.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBulkModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300
                           hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Layers size={16} />
                Kamers in bulk
              </button>
              <button
                onClick={() => setModalRoom("new")}
                className="flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white
                           hover:bg-sky-600 active:bg-sky-700 transition-colors shadow-lg shadow-sky-500/20"
              >
                <Plus size={16} />
                Eerste kamer toevoegen
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
              className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 mx-auto max-w-lg flex items-center gap-3 rounded-2xl
                         border border-rose-200 dark:border-rose-500/20 bg-white dark:bg-slate-900 px-4 py-3.5 shadow-xl"
            >
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                Kamer verwijderen?
              </p>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Annuleer
              </button>
              <button
                onClick={() => {
                  const room = rooms.find((r) => r.id === confirmDeleteId);
                  if (room) handleDelete(room);
                }}
                disabled={deleteRoom.isPending}
                className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {deleteRoom.isPending ? "Bezig…" : "Verwijder"}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
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
