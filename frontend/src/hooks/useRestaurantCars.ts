import { useClaimSeat, useAssignToDriver, useUnassignFromDriver } from "./useRides";
import { useRsvpMeal } from "./useMeals";
import { toast } from "../store/toast.store";
import type { Meal, Ride } from "../types";

/**
 * Putting people in and out of the cars of a restaurant ride. Shared by the
 * meal/ride detail page and the Vervoer sheet so both behave the same — in
 * particular, anyone getting into a car is also signed up for the meal.
 */
export function useRestaurantCars(ride: Ride, linkedMeal?: Meal) {
  const claimMutation = useClaimSeat();
  const assignMutation = useAssignToDriver();
  const unassignMutation = useUnassignFromDriver();
  const rsvpMealMutation = useRsvpMeal();

  const attendees = linkedMeal ? (linkedMeal.participants ?? []) : ride.passengers;

  /** Anyone getting into a car is going to the meal, so put them on its list too. */
  async function ensureOnMeal(name: string) {
    if (!linkedMeal || (linkedMeal.participants ?? []).includes(name)) return;
    await rsvpMealMutation.mutateAsync({ id: linkedMeal.id, payload: { user_name: name } });
  }

  async function join(driverName: string, names: string[]): Promise<boolean> {
    if (names.length === 0) return false;
    try {
      for (const name of names) {
        await ensureOnMeal(name);
        if (!attendees.includes(name)) {
          await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
        }
        await assignMutation.mutateAsync({ id: ride.id, payload: { user_name: name, driver_name: driverName } });
      }
      toast(
        "success",
        names.length === 1 ? `${names[0]} rijdt mee met ${driverName}` : `${names.length} personen rijden mee met ${driverName}`,
      );
      return true;
    } catch {
      toast("error", "Kon niet toewijzen.");
      return false;
    }
  }

  async function unassign(names: string[]): Promise<boolean> {
    if (names.length === 0) return false;
    try {
      for (const name of names) {
        await unassignMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      toast("info", names.length === 1 ? `${names[0]} uitgestapt` : `${names.length} personen uitgestapt`);
      return true;
    } catch {
      toast("error", "Kon niet verwijderen.");
      return false;
    }
  }

  const isPending =
    claimMutation.isPending || assignMutation.isPending || unassignMutation.isPending || rsvpMealMutation.isPending;

  return { attendees, ensureOnMeal, join, unassign, isPending };
}
