import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Car, Train, AlertCircle } from "lucide-react";
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
import { AvatarStack } from "../../components/common/AvatarStack";
import { groupPeople } from "../../utils/people";
import { AdminDrawer } from "./AdminDrawer";
import { NamePicker } from "../../components/common/NamePicker";
import { toast } from "../../store/toast.store";
import type { Ride } from "../../types";
import { F, FS, L, TH, TD, TR, TR_SELECTED, TAG } from "./styles";
import { DIRECTION_LABEL, VEHICLE_LABEL } from "./constants";
import { AdminPage } from "./components/AdminPage";
import { ToggleRow } from "./components/ToggleRow";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { ParticipantList } from "./components/ParticipantList";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { RowCheckbox } from "./components/RowCheckbox";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";

const PAGE_SIZE = 15;
const DIRECTIONS = ["Inbound", "Outbound", "Restaurant"] as const;
const VEHICLE_TYPES = ["Car", "Public Transport"] as const;

const rideSchema = z.object({
  direction: z.enum(["Inbound", "Outbound", "Restaurant"]),
  vehicle_type: z.enum(["Car", "Public Transport"]),
  driver: z.string().min(1, "Chauffeur is verplicht"),
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
    setValue,
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
  const carAvailable = watch("car_available");
  const actionRequired = watch("action_required");

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
        isEdit ? `${DIRECTION_LABEL[ride.direction] ?? ride.direction} · ${ride.driver}` : "Voeg een nieuwe rit toe"
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
                  {DIRECTION_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={L}>Voertuig</label>
            <select {...register("vehicle_type")} className={FS}>
              {VEHICLE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {VEHICLE_LABEL[v]}
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
            <p className="field-error">
              {errors.driver.message}
            </p>
          )}
        </div>

        <div>
          <label className={L}>Vertrektijd</label>
          <input {...register("departure_time")} type="datetime-local" className={F} />
          {errors.departure_time && (
            <p className="field-error">
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
            <p className="field-error">{errors.start_location.message}</p>
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
            <p className="mt-1.5 text-xs text-ink-3">Incl. de chauffeur</p>
          </div>
        )}

        <div>
          <label className={L}>Parkeertips</label>
          <input {...register("parking_info")} className={F} placeholder="Optioneel" />
        </div>

        <ToggleRow
          icon={<Car size={16} />}
          label="Auto beschikbaar"
          checked={!!carAvailable}
          onChange={() => setValue("car_available", !carAvailable, { shouldDirty: true })}
        />
        <ToggleRow
          icon={<AlertCircle size={16} />}
          label="Actie vereist"
          checked={!!actionRequired}
          onChange={() => setValue("action_required", !actionRequired, { shouldDirty: true })}
        />

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
      r.direction.toLowerCase().includes(q) ||
      (DIRECTION_LABEL[r.direction] ?? "").toLowerCase().includes(q)
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
    <AdminPage>
      <AdminPageHeader
        title="Ritten"
        subtitle={`${rides.length} ${rides.length === 1 ? "rit" : "ritten"} gepland`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="btn-primary min-h-[44px] gap-2 px-4 py-2.5 text-sm"
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
              className={`chip ${dirFilter === d ? "chip-on" : "chip-off"}`}
            >
              {d === "All" ? "Alle" : DIRECTION_LABEL[d]}
            </button>
          ))}
        </div>
        <AdminSearch
          value={search}
          onChange={handleSearch}
          placeholder="Zoek op chauffeur of locatie…"
        />
      </div>

      <AdminBulkBar
        itemsLabel="ritten"
        count={selectedIds.size}
        isPending={bulkDeleteMutation.isPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-table w-full">
            <thead>
              <tr>
                <th className={`${TH} w-10 !pr-2`}>
                  <RowCheckbox checked={allSelected} indeterminate={indeterminate} onChange={selectAll} label="Alles selecteren" />
                </th>
                <th className={TH}>Rit</th>
                <th className={`${TH} hidden sm:table-cell`}>Vertrek</th>
                <th className={`${TH} hidden sm:table-cell`}>Zitplaatsen</th>
                <th className={`${TH} hidden sm:table-cell`}>Passagiers</th>
                <th className={`${TH} text-right`}>Acties</th>
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
                paginated.map((ride) => {
                  const isSelected = selectedIds.has(ride.id);
                  const name = ride.driver || ride.start_location;
                  return (
                    <tr key={ride.id} className={isSelected ? TR_SELECTED : TR}>
                      <td className={`${TD} w-10 !pr-2`} onClick={(e) => { e.stopPropagation(); toggleSelect(ride.id); }}>
                        <RowCheckbox checked={isSelected} onChange={() => toggleSelect(ride.id)} label={`Selecteer ${name}`} />
                      </td>
                      <td className={`cell-main ${TD}`}>
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                            {ride.is_public_transport ? <Train size={14} /> : <Car size={14} />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{ride.driver}</p>
                            <span className={`${TAG} mt-0.5`}>{DIRECTION_LABEL[ride.direction] ?? ride.direction}</span>
                            {/* On a phone the other columns are hidden; the row is these two lines. */}
                            <p className="mt-0.5 truncate text-xs text-ink-3 sm:hidden">
                              {formatDateTime(ride.departure_time)} · {ride.start_location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <p className="whitespace-nowrap font-mono text-sm text-ink-2">{formatDateTime(ride.departure_time)}</p>
                        <p className="truncate text-xs text-ink-3">{ride.start_location}</p>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        {ride.is_public_transport ? (
                          <span className="text-xs text-ink-3">n.v.t.</span>
                        ) : (
                          <span className="font-mono text-sm font-medium tabular-nums text-ink-2">
                            {groupPeople(ride.passengers, allUsers).length}/{ride.total_seats}
                          </span>
                        )}
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        {ride.passengers.length === 0 ? (
                          <span className="text-xs text-ink-3">—</span>
                        ) : (
                          <AvatarStack names={ride.passengers} size="sm" max={4} />
                        )}
                      </td>
                      <td className={`cell-actions ${TD}`}>
                        <DeleteConfirmActions
                          id={ride.id}
                          confirmId={confirmDeleteId}
                          isPending={deleteMutation.isPending}
                          onEdit={() => setDrawer(ride)}
                          onRequestDelete={() => setConfirmDeleteId(ride.id)}
                          onConfirmDelete={() => handleDelete(ride.id)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                          editLabel={`Rit van ${name} bewerken`}
                          deleteLabel={`Rit van ${name} verwijderen`}
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

      <RideDrawer
        key={
          typeof drawer === "object" && drawer !== null
            ? drawer.id
            : (drawer ?? "none")
        }
        ride={drawer}
        onClose={() => setDrawer(null)}
      />
    </AdminPage>
  );
}
