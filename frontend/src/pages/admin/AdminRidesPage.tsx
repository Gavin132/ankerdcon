import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Car, Train } from "lucide-react";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { formatDateTime } from "../../utils/format";
import {
  useAdminRides,
  useAdminUsers,
  useAdminCreateRide,
  useAdminUpdateRide,
  useAdminDeleteRide,
  useAdminRemovePassenger,
  useAdminBulkDeleteRides,
} from "../../hooks/useAdmin";
import { useCalendar } from "../../hooks/useCalendar";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminDrawer } from "./AdminDrawer";
import { NamePicker } from "../../components/common/NamePicker";
import { toast } from "../../store/toast.store";
import type { Ride } from "../../types";
import { F, FS, L } from "./styles";
import { DIRECTION_COLORS } from "./constants";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { ParticipantList } from "./components/ParticipantList";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";

const PAGE_SIZE = 15;
const DIRECTIONS = ["Inbound", "Outbound", "Restaurant"] as const;
const VEHICLE_TYPES = ["Car", "Public Transport"] as const;

const rideSchema = z.object({
  direction: z.enum(["Inbound", "Outbound", "Restaurant"]),
  vehicle_type: z.enum(["Car", "Public Transport"]),
  driver: z.string().min(1, "Driver is verplicht"),
  departure_time: z.string().min(1, "Vertrektijd is verplicht"),
  start_location: z.string().min(1, "Startlocatie is verplicht"),
  end_location: z.string().optional(),
  total_seats: z.coerce.number().min(0),
  parking_info: z.string().optional(),
  car_available: z.boolean().optional(),
  action_required: z.boolean().optional(),
  linked_event_id: z.string().optional(),
});
type RideForm = z.infer<typeof rideSchema>;

// ── Ride drawer ───────────────────────────────────────────────────────────────

function RideDrawer({
  ride,
  onClose,
}: {
  ride: Ride | "new" | null;
  onClose: () => void;
}) {
  const createMutation = useAdminCreateRide();
  const updateMutation = useAdminUpdateRide();
  const removePassenger = useAdminRemovePassenger();
  const { data: allUsers = [] } = useAdminUsers();
  const { data: allEvents = [] } = useCalendar();
  const userNames = allUsers.map((u) => u.name);
  const isEdit = ride !== null && ride !== "new";
  const open = ride !== null;

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm<RideForm>({
    resolver: zodResolver(rideSchema),
    defaultValues: {
      direction: isEdit ? (ride.direction as RideForm["direction"]) : "Inbound",
      vehicle_type: isEdit
        ? (ride.vehicle_type as RideForm["vehicle_type"])
        : "Car",
      driver: isEdit ? ride.driver : "",
      departure_time: isEdit ? ride.departure_time.replace(" ", "T").slice(0, 16) : "",
      start_location: isEdit ? ride.start_location : "",
      end_location: isEdit ? (ride.end_location ?? "") : "",
      total_seats: isEdit ? ride.total_seats : 5,
      parking_info: isEdit ? ride.parking_info : "",
      car_available: isEdit ? ride.car_available : false,
      action_required: isEdit ? ride.action_required : false,
      linked_event_id: isEdit ? (ride.linked_event_id ?? "") : "",
    },
  });
  const vehicleType = watch("vehicle_type");
  const isPT = vehicleType === "Public Transport";

  async function onSubmit(values: RideForm) {
    const payload = { ...values, linked_event_id: values.linked_event_id || undefined };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: ride.id, ...payload });
        toast("success", "Rit bijgewerkt.");
      } else {
        await createMutation.mutateAsync(payload);
        toast("success", "Rit aangemaakt.");
      }
      onClose();
    } catch {
      toast("error", "Kon rit niet opslaan.");
    }
  }

  async function handleRemovePassenger(p: string) {
    if (!isEdit) return;
    try {
      await removePassenger.mutateAsync({ rideId: ride.id, passenger: p });
      toast("success", `${p} verwijderd.`);
    } catch {
      toast("error", "Kon passagier niet verwijderen.");
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const { requestClose, confirming, confirmDiscard, cancelDiscard } = useConfirmDiscard(isDirty, onClose);

  return (
    <>
    <AdminDrawer
      open={open}
      onClose={requestClose}
      title={isEdit ? "Rit bewerken" : "Nieuwe rit"}
      subtitle={
        isEdit ? `${ride.direction} · ${ride.driver}` : "Voeg een nieuwe rit toe"
      }
      footer={
        <DrawerFooter
          onCancel={requestClose}
          formId="ride-form"
          isPending={isPending}
          isEdit={isEdit}
        />
      }
    >
      <form
        id="ride-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={L}>Richting</label>
            <select {...register("direction")} className={FS}>
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={L}>Voertuig</label>
            <select {...register("vehicle_type")} className={FS}>
              {VEHICLE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={L}>Chauffeur / Lijn</label>
          <Controller
            name="driver"
            control={control}
            render={({ field }) => (
              <NamePicker
                options={userNames}
                value={field.value}
                onChange={field.onChange}
                placeholder="Zoek naam of alias…"
              />
            )}
          />
          {errors.driver && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              {errors.driver.message}
            </p>
          )}
        </div>

        <div>
          <label className={L}>Vertrektijd</label>
          <input {...register("departure_time")} type="datetime-local" className={F} />
          {errors.departure_time && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              {errors.departure_time.message}
            </p>
          )}
        </div>

        <div>
          <label className={L}>Startlocatie *</label>
          <Controller
            name="start_location"
            control={control}
            render={({ field }) => (
              <LocationSearchInput
                value={field.value ?? ""}
                onChange={field.onChange}
                inputClassName={F}
                placeholder="Zoek vertrekpunt…"
              />
            )}
          />
          {errors.start_location && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.start_location.message}</p>
          )}
        </div>

        <div>
          <label className={L}>Bestemming (optioneel)</label>
          <Controller
            name="end_location"
            control={control}
            render={({ field }) => (
              <LocationSearchInput
                value={field.value ?? ""}
                onChange={field.onChange}
                inputClassName={F}
                placeholder="Zoek eindbestemming…"
              />
            )}
          />
        </div>

        {!isPT && (
          <div>
            <label className={L}>Totaal aantal plekken in de auto</label>
            <input {...register("total_seats")} type="number" min={0} className={F} />
            <p className="mt-1.5 text-[11px] text-ink-3">Incl. de chauffeur</p>
          </div>
        )}

        <div>
          <label className={L}>Parkeertips</label>
          <input {...register("parking_info")} className={F} placeholder="Optioneel" />
        </div>

        <div className="flex gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("car_available")}
              className="cb"
            />
            <span className="text-sm text-ink-2">Auto beschikbaar</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("action_required")}
              className="cb"
            />
            <span className="text-sm text-ink-2">Actie vereist</span>
          </label>
        </div>

        <div>
          <label className={L}>Koppel aan evenement</label>
          <select {...register("linked_event_id")} className={F}>
            <option value="">— Geen evenement —</option>
            {allEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.event_name} ({ev.date})
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <ParticipantList
            participants={ride.passengers}
            onRemove={handleRemovePassenger}
            isPending={removePassenger.isPending}
            label="Passagiers"
          />
        )}
      </form>
    </AdminDrawer>
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminRidesPage() {
  const { data: rides = [], isLoading } = useAdminRides();
  const { data: allUsers = [] } = useAdminUsers();
  const deleteMutation = useAdminDeleteRide();
  const bulkDeleteMutation = useAdminBulkDeleteRides();
  const [dirFilter, setDirFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<Ride | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = rides.filter((r) => {
    if (dirFilter !== "All" && r.direction !== dirFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.driver.toLowerCase().includes(q) ||
      r.start_location.toLowerCase().includes(q) ||
      r.direction.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  const { selectedIds, toggleSelect, selectAll, clearSelection, allSelected, indeterminate } =
    useTableSelection(paginated.map((r) => r.id));

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast("success", `${ids.length} ritten verwijderd.`);
      clearSelection();
    } catch {
      toast("error", "Kon ritten niet verwijderen.");
    }
  }

  function handleFilter(dir: string) {
    setDirFilter(dir);
    setPage(0);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  async function handleDelete(rideId: string) {
    try {
      await deleteMutation.mutateAsync(rideId);
      toast("success", "Rit verwijderd.");
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon rit niet verwijderen.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Ritten"
        subtitle={`${rides.length} ritten gepland`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="btn-primary gap-2 px-4 py-2.5 text-sm"
          >
            <Plus size={16} />
            Nieuwe rit
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Direction tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["All", ...DIRECTIONS].map((d) => (
            <button
              key={d}
              onClick={() => handleFilter(d)}
              className={`shrink-0 rounded-full border-1.5 px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                dirFilter === d
                  ? "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                  : "border-line bg-surface text-ink-2 hover:border-ink-3"
              }`}
            >
              {d === "All" ? "Alle" : d}
            </button>
          ))}
        </div>
        <AdminSearch
          value={search}
          onChange={handleSearch}
          placeholder="Zoek op chauffeur of locatie..."
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
                  Rit
                </th>
                <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Vertrek
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Zitplaatsen
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Passagiers
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-ink-3"
                  >
                    Geen ritten gevonden.
                  </td>
                </tr>
              ) : (
                paginated.map((ride) => (
                  <tr
                    key={ride.id}
                    className={`transition-colors ${selectedIds.has(ride.id) ? "bg-brand-soft/50 hover:bg-brand-soft/70" : "hover:bg-sunken"}`}
                  >
                    <td
                      className="w-8 sm:w-10 pl-2.5 sm:pl-4 pr-1.5 sm:pr-2 py-2.5 sm:py-3.5"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(ride.id); }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ride.id)}
                        onChange={() => toggleSelect(ride.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="cb"
                      />
                    </td>
                    <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink sm:h-7 sm:w-7"
                        >
                          {ride.is_public_transport ? (
                            <Train size={13} />
                          ) : (
                            <Car size={13} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">
                            {ride.driver}
                          </p>
                          <span
                            className={`mt-0.5 inline-block rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] ${DIRECTION_COLORS[ride.direction] ?? "text-ink-2"}`}
                          >
                            {ride.direction}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                      <p className="text-sm text-ink-2 font-mono whitespace-nowrap">
                        {formatDateTime(ride.departure_time)}
                      </p>
                      <p className="text-xs text-ink-3 truncate max-w-[140px] sm:max-w-none">
                        {ride.start_location}
                      </p>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5">
                      {ride.is_public_transport ? (
                        <span className="text-xs text-ink-3">N/A</span>
                      ) : (
                        <span className="font-mono text-sm font-medium tabular-nums text-ink-2">
                          {ride.passengers.length}/{ride.total_seats}
                        </span>
                      )}
                    </td>
                    <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                      <div className="flex -space-x-1.5">
                        {ride.passengers.length === 0 ? (
                          <span className="text-xs text-ink-3">—</span>
                        ) : (
                          <>
                            {ride.passengers.slice(0, 4).map((p) => {
                              const resolved = allUsers.find(
                                (u) => u.name === p || u.discord_username === p,
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
                            {ride.passengers.length > 4 && (
                              <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full ring-2 ring-surface bg-sunken text-[8px] sm:text-[9px] font-bold text-ink-2">
                                +{ride.passengers.length - 4}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                      <DeleteConfirmActions
                        id={ride.id}
                        confirmId={confirmDeleteId}
                        isPending={deleteMutation.isPending}
                        onEdit={() => setDrawer(ride)}
                        onRequestDelete={() => setConfirmDeleteId(ride.id)}
                        onConfirmDelete={() => handleDelete(ride.id)}
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

      <RideDrawer
        key={
          typeof drawer === "object" && drawer !== null
            ? drawer.id
            : (drawer ?? "none")
        }
        ride={drawer}
        onClose={() => setDrawer(null)}
      />

      <AdminBulkBar
        count={selectedIds.size}
        isPending={bulkDeleteMutation.isPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />
    </div>
  );
}
