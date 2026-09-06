-- Lets a room say how many people it fits, so rooms can be generated in bulk
-- ("10 rooms of 2, 2 rooms of 3") and self-assign can stop once a room is full.
-- Nullable: existing rooms (and any added without a capacity) are simply
-- uncapped, same as today's behavior.
ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS capacity integer;
