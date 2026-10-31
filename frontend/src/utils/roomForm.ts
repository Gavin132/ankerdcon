export interface RoomFormValues {
  room_number: string;
  floor: string;
  instructions: string;
  capacity: string;
  occupants: string[];
}

/** What the form sends for a new room: fields left empty are simply left out. */
export function roomCreatePayload(values: RoomFormValues) {
  return {
    room_number: values.room_number.trim() || undefined,
    floor: values.floor.trim() || undefined,
    instructions: values.instructions.trim() || undefined,
    capacity: values.capacity.trim() ? Number(values.capacity) : undefined,
    occupants: values.occupants,
  };
}

/**
 * What the form sends for an existing room. A field that was emptied has to go as `null`: an omitted field means
 * "leave as it is" to the server, so a cleared room number (or capacity) would silently come back.
 */
export function roomEditPayload(values: RoomFormValues) {
  return {
    room_number: values.room_number.trim() || null,
    floor: values.floor.trim() || null,
    instructions: values.instructions.trim() || null,
    capacity: values.capacity.trim() ? Number(values.capacity) : null,
    occupants: values.occupants,
  };
}
