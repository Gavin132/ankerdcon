-- Room numbers aren't always known until check-in (hotels often assign them
-- on arrival), so a room needs to be creatable — and shown in the layout —
-- before it has a number.
ALTER TABLE hotel_rooms ALTER COLUMN room_number DROP NOT NULL;
