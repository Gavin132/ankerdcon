import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BedDouble, Plus, Users, Pencil, Trash2, X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendar } from "../hooks/useCalendar";
import {
  useHotelRooms,
  useCreateHotelRoom,
  useAssignHotelRoom,
  useLeaveHotelRoom,
} from "../hooks/useCalendar";
import { useAdminUpdateHotelRoom, useAdminDeleteHotelRoom } from "../hooks/useAdmin";
import { useUsers, useCurrentUser } from "../hooks/useUsers";
import { UserAvatar } from "../components/common/UserAvatar";
import { NamePicker } from "../components/common/NamePicker";
import { Modal } from "../components/common/Modal";
import { Button } from "../components/common/Button";
import { toast } from "../store/toast.store";
import type { HotelRoom } from "../types";

// ── Room form modal ────────────────────────────────────────────────────────────

interface RoomFormValues {
  room_number: string;
  floor: string;
  instructions: string;
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
    occupants: room?.occupants ?? [],
  });

  const isPending = createRoom.isPending || updateRoom.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.room_number.trim()) return;
    try {
      if (isEdit) {
        await updateRoom.mutateAsync({
          eventId,
          roomId: room.id,
          payload: {
            room_number: values.room_number.trim(),
            floor: values.floor.trim() || undefined,
            instructions: values.instructions.trim() || undefined,
            occupants: values.occupants,
          },
        });
        toast("success", `Kamer ${values.room_number} bijgewerkt.`);
      } else {
        await createRoom.mutateAsync({
          eventId,
          payload: {
            room_number: values.room_number.trim(),
            floor: values.floor.trim() || undefined,
            instructions: values.instructions.trim() || undefined,
            occupants: values.occupants,
          },
        });
        toast("success", `Kamer ${values.room_number} aangemaakt.`);
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
      title={isEdit ? `Kamer ${room?.room_number} bewerken` : "Nieuwe kamer"}
      description={isEdit ? "Pas de kamerdetails aan" : "Voeg een hotelkamer toe aan dit evenement"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Kamernummer *
            </label>
            <input
              className="input-field"
              placeholder="101"
              value={values.room_number}
              onChange={(e) => setValues((v) => ({ ...v, room_number: e.target.value }))}
              autoFocus
            />
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
        </div>

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

        <Button type="submit" loading={isPending} className="w-full" disabled={!values.room_number.trim()}>
          <BedDouble size={16} />
          {isEdit ? "Opslaan" : "Kamer aanmaken"}
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
  const resolveUser = (name: string) =>
    (users ?? []).find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));

  async function handleSelfAssign() {
    if (!currentUserName) return;
    try {
      await assignRoom.mutateAsync({ eventId, roomId: room.id, userNames: [currentUserName] });
    } catch {
      toast("error", "Kon je niet aanmelden voor deze kamer.");
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
              <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                {room.room_number}
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
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {room.occupants.length === 0
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

export function HotelRoomsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: events = [] } = useCalendar();
  const { data: rooms = [], isLoading } = useHotelRooms(id ?? "");
  const { data: users = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();

  const isAdmin = currentUser?.is_admin ?? false;
  const currentUserName = currentUser?.name;
  const event = events.find((e) => e.id === id);

  const deleteRoom = useAdminDeleteHotelRoom();

  const [modalRoom, setModalRoom] = useState<HotelRoom | null | "new">(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const userNames = users.map((u) => u.name);

  // Stats
  const assignedNames = new Set(rooms.flatMap((r) => r.occupants));
  const eventAttendees = event?.participants ?? [];
  const unassigned = eventAttendees.filter((p) => !assignedNames.has(p));

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <BedDouble size={40} className="opacity-30" />
        <p className="text-sm">Evenement niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">Terug</button>
      </div>
    );
  }

  if (!event.is_hotel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <BedDouble size={40} className="opacity-30" />
        <p className="text-sm">Dit evenement heeft geen hotel</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">Terug</button>
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
      toast("success", `Kamer ${room.room_number} verwijderd.`);
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon kamer niet verwijderen.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">

      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4
                      bg-white/90 dark:bg-slate-950/90 backdrop-blur-md
                      border-b border-slate-200 dark:border-white/[0.06]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl
                     text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-white/[0.08]
                     hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
            Hotelkamers
          </p>
          <p className="text-[10px] text-slate-400 leading-tight truncate">{event.event_name}</p>
        </div>
        {(isAdmin || true) && (
          <button
            onClick={() => setModalRoom("new")}
            className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white
                       hover:bg-sky-600 active:bg-sky-700 transition-colors shrink-0"
          >
            <Plus size={14} />
            Kamer
          </button>
        )}
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 140 }}>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 15% 50%, #0c4a6edd 0%, transparent 60%),
              radial-gradient(ellipse at 85% 25%, #0f172a 0%, transparent 55%),
              linear-gradient(150deg, #0f172a 0%, #0c4a6e 55%, #075985 100%)
            `,
          }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.12] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <filter id="hotel-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hotel-noise)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
          <BedDouble size={140} strokeWidth={1} className="text-white" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300/60 mb-1">
            {event.event_name}
          </p>
          <h1 className="text-2xl font-black text-white drop-shadow-md mb-3">Hotelkamers</h1>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5">
              <BedDouble size={12} className="text-white/60" />
              <span className="text-xs font-bold text-white">
                {rooms.length} {rooms.length === 1 ? "kamer" : "kamers"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5">
              <Users size={12} className="text-white/60" />
              <span className="text-xs font-bold text-white">
                {assignedNames.size} van {eventAttendees.length} ingedeeld
              </span>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10 pt-5 space-y-5">

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <button
              onClick={() => setModalRoom("new")}
              className="flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white
                         hover:bg-sky-600 active:bg-sky-700 transition-colors shadow-lg shadow-sky-500/20"
            >
              <Plus size={16} />
              Eerste kamer toevoegen
            </button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
              {/* Add room card */}
              <motion.button
                key="add-room"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setModalRoom("new")}
                className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700
                           flex flex-col items-center justify-center gap-2 py-8
                           text-slate-400 hover:border-sky-400 hover:text-sky-500
                           dark:hover:border-sky-500 dark:hover:text-sky-400
                           transition-colors cursor-pointer min-h-[120px]"
              >
                <Plus size={20} />
                <span className="text-xs font-semibold">Kamer toevoegen</span>
              </motion.button>
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
              className="fixed bottom-6 left-4 right-4 z-20 mx-auto max-w-lg flex items-center gap-3 rounded-2xl
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
    </div>
  );
}
