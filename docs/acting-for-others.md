# Acting for someone else

Who may sign someone else up for a meal, a ride or a trip day, or log an
expense in their name?

**Current rule:** members only act for themselves. Admins may act for anyone.

This was a choice between two options, and the other one is still open for
discussion. This page explains how the rule is enforced and what would change
to switch.

## How it's enforced

- **Backend:** `act_as(current_user, requested)` in
  `backend/app/dependencies.py` decides who an action is for:
  - no name, or your own name: allowed;
  - one of your former names (`aliases`) that no other profile uses:
    allowed, so leaving a trip also clears old sign-ups;
  - anyone else: allowed for admins only, otherwise a 403.
- **Where it's used:** every endpoint that takes a name from the request.
  - Meals: RSVP and cancel.
  - Rides: claim or leave a seat, and the restaurant driver endpoints.
  - Trip days: RSVP and leave.
  - Hotel rooms: assign and leave.
  - Cosplays: create.
  - Expenses and payments: `paid_by`.
  - Location pings.
- **Frontend:** `useActingPermissions()` in `frontend/src/hooks/useUsers.ts`
  mirrors this, so name pickers only offer names the API accepts:
  - `actable(names)` filters a list of names;
  - `canActFor(name)` checks one name.

These are separate from what anyone may do regardless of this rule. Deletes
always require the creator or an admin (`require_owner_or_admin`). Expense
shares are claimed by the person who owes them and confirmed by the payer.

## Switching to "members may sign up others"

In this option, members may sign anyone up for meals, rides, restaurant cars,
trip days and hotel rooms, as before. Things that belong to one person stay
restricted: `paid_by`, location pings, cosplays and all deletes.

1. **Backend:** add `act_for_anyone(current_user, requested)` next to
   `act_as`. It returns `requested or current_user`.
2. Use `act_for_anyone` instead of `act_as` in these endpoints:
   - `routers/meals.py`: `rsvp`, `cancel_rsvp`
   - `routers/rides.py`: `claim_seat`, `leave_seat`, `add_restaurant_driver`,
     `leave_restaurant_driver`, `assign_to_driver`, `unassign_from_driver`
   - `routers/calendar.py`: `rsvp_event`, `leave_event`, `assign_hotel_room`,
     `leave_hotel_room`
3. Keep `act_as` in these endpoints:
   - `routers/expenses.py`: `create_expense`
   - `routers/payments.py`: `create_payment`
   - `routers/users.py`: `ping_location`
   - `routers/cosplays.py`: `create_cosplay`
   - `routers/rides.py`: `create_ride` (the driver)
4. **Frontend:** remove the `actable(...)` wrapper around `options` in these
   pickers:
   - `MealCard`, `MealDetailPage`
   - `RideCard`, `RideDetailPage`, `JoinRideModal`
   - `CarCard`, `RestaurantDetailActions`: both pickers, plus the
     `canActFor(name)` check on "Wijs toe"
   - `TripRsvpModal`
5. **Frontend:** keep `actable(...)` in `CreateExpenseDrawer` (paid by),
   `LocationPingModal` and `TripCosplayTab`.

Even with that switch, a member could still sign anyone up or off without
their consent. If that's the goal, consider logging who made each change.
