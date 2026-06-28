import { useState } from "react";
import {
  Plus,
  Users,
  ParkingCircle,
  ExternalLink,
  MapPin,
  CalendarPlus,
  Navigation,
} from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { useClaimSeat, useLeaveSeat } from "../../hooks/useRides";
import { exportRideToIcs } from "../../utils/ics";
import { buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import { getRideStatus } from "../../utils/rides";
import { toast } from "../../store/toast.store";
import type { Ride, User } from "../../types";

interface RideActionsProps {
  ride: Ride;
  userNames: string[];
  users: User[];
}

export function RideActions({ ride, userNames, users }: RideActionsProps) {
  const [claimOpen, setClaimOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [claimNames, setClaimNames] = useState<string[]>([]);
  const [leaveNames, setLeaveNames] = useState<string[]>([]);

  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();

  const { status } = getRideStatus(ride.departure_time);
  const canAct = status !== "recent" && status !== "past";
  const isPT = ride.is_public_transport;

  const isInbound = ride.direction === "Inbound";
  const fromLabel = ride.start_location;
  const toLabel   = ride.end_location || (isInbound ? "Con locatie" : "Bestemming");
  const embedUrl  = buildEmbedUrl(fromLabel, toLabel !== fromLabel ? toLabel : undefined);
  const openUrl   = ride.end_location
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromLabel)}&destination=${encodeURIComponent(toLabel)}`
    : buildMapsOpenUrl("", fromLabel);

  function resolveUser(stored: string) {
    return users.find(
      (u) =>
        u.name === stored ||
        u.discord_username === stored ||
        u.aliases?.includes(stored),
    );
  }

  const resolvedPassengers = new Set(
    ride.passengers.map((p) => resolveUser(p)?.name ?? p),
  );
  const availableToJoin = userNames.filter((n) => !resolvedPassengers.has(n));

  async function handleClaim() {
    if (claimNames.length === 0) return;
    try {
      for (const name of claimNames) {
        await claimMutation.mutateAsync({
          id: ride.id,
          payload: { user_name: name },
        });
      }
      setClaimNames([]);
      setClaimOpen(false);
      toast(
        "success",
        claimNames.length === 1
          ? `${claimNames[0]} staat in de rit!`
          : `${claimNames.length} personen staan in de rit!`,
      );
    } catch {
      toast("error", "Kon plek niet claimen.");
    }
  }

  async function handleLeave() {
    if (leaveNames.length === 0) return;
    try {
      for (const name of leaveNames) {
        await leaveMutation.mutateAsync({
          id: ride.id,
          payload: { user_name: name },
        });
      }
      setLeaveNames([]);
      setLeaveOpen(false);
      toast(
        "success",
        leaveNames.length === 1
          ? `${leaveNames[0]} is uitgestapt.`
          : `${leaveNames.length} personen uitgestapt.`,
      );
    } catch {
      toast("error", "Kon je niet uitschrijven.");
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Passengers ───────────────────────────────────────────── */}
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-sky-400 to-blue-500" />
          <div className="px-4 py-4 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Meerijders</h2>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {ride.passengers.length}{" "}
                  <span className="text-sm font-semibold text-slate-400">
                    {ride.passengers.length === 1 ? "meerijder" : "meerijders"}
                  </span>
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
                <Users size={20} className="text-sky-600 dark:text-sky-400" />
              </div>
            </div>

            {/* Passenger grid */}
            {ride.passengers.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {ride.passengers.map((p) => {
                  const u = resolveUser(p);
                  return (
                    <div
                      key={p}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-black/20 px-3 py-2.5"
                    >
                      <UserAvatar name={p} user={u} className="h-7 w-7 text-[10px] shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {u?.name ?? p}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
                  <Users size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Nog geen meerijders</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {canAct ? "Stap in via de knop hieronder." : "De rit is al vertrokken."}
                </p>
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-2.5 pt-1">
              {canAct && !ride.is_full && (
                <Button
                  onClick={() => { setClaimNames([]); setClaimOpen(true); }}
                  className="flex-1"
                >
                  <Plus size={14} />
                  Stap in
                </Button>
              )}
              {canAct && ride.passengers.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => { setLeaveNames([]); setLeaveOpen(true); }}
                >
                  Uitstappen
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => exportRideToIcs(ride)}
                title="Toevoegen aan kalender"
              >
                <CalendarPlus size={14} className="text-sky-500" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Parking info ─────────────────────────────────────────── */}
        {ride.parking_info && (
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500" />
            <div className="px-4 py-4">
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <ParkingCircle size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Parkeerinfo</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {ride.parking_info}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Map (always visible) ──────────────────────────────────── */}
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-teal-400 to-cyan-500" />

          {/* Map header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                <MapPin size={13} className="text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Route</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {fromLabel}{toLabel !== fromLabel ? ` → ${toLabel}` : ""}
                </p>
              </div>
            </div>
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition-colors"
            >
              <Navigation size={11} />
              Route
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Embedded map */}
          <div className="relative">
            <iframe
              title="Route kaart"
              src={embedUrl}
              className="w-full h-[240px] border-0 block"
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Claim seat modal */}
      <Modal
        open={claimOpen}
        onClose={() => { setClaimOpen(false); setClaimNames([]); }}
        title="Stap in"
        description={`${fromLabel} → ${toLabel}${isPT ? "" : ` · ${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}`}
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={availableToJoin}
            value={claimNames}
            onChange={setClaimNames}
            maxSelect={isPT ? undefined : ride.seats_left}
            color="sky"
          />
          <Button
            onClick={handleClaim}
            loading={claimMutation.isPending}
            className="w-full"
            disabled={claimNames.length === 0}
          >
            <Plus size={15} />
            {claimNames.length === 0
              ? "Selecteer een naam"
              : claimNames.length === 1
                ? `${claimNames[0]} stapt in`
                : `${claimNames.length} personen stappen in`}
          </Button>
        </div>
      </Modal>

      {/* Leave modal */}
      <Modal
        open={leaveOpen}
        onClose={() => { setLeaveOpen(false); setLeaveNames([]); }}
        title="Uitstappen"
        description="Wie stappen er uit?"
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={ride.passengers}
            value={leaveNames}
            onChange={setLeaveNames}
            color="rose"
          />
          <Button
            onClick={handleLeave}
            variant="danger"
            loading={leaveMutation.isPending}
            className="w-full"
            disabled={leaveNames.length === 0}
          >
            {leaveNames.length === 0
              ? "Selecteer een naam"
              : leaveNames.length === 1
                ? `${leaveNames[0]} uitstappen`
                : `${leaveNames.length} personen uitstappen`}
          </Button>
        </div>
      </Modal>
    </>
  );
}
