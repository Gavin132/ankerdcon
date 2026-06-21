import { Ride, RestaurantGap } from "../../types";
import { getRideStatus, parseRestaurantDrivers } from "../../utils/rides";

export function computeRestaurantGaps(rides: Ride[]): RestaurantGap[] {
  return rides
    .filter((r) => r.direction === "Restaurant")
    .flatMap((ride) => {
      const { status } = getRideStatus(ride.departure_time);
      if (status === "past") return [];
      const drivers = parseRestaurantDrivers(ride.parking_info);
      const driverNames = new Set(drivers.map((d) => d.name));
      const assignedPax = new Set(drivers.flatMap((d) => d.passengers));
      const unassigned = ride.passengers.filter(
        (a) => !driverNames.has(a) && !assignedPax.has(a),
      );
      if (unassigned.length === 0) return [];
      return [
        {
          rowNumber: ride.row_number,
          location: ride.start_location,
          departureTime: ride.departure_time,
          unassigned,
        },
      ];
    });
}
