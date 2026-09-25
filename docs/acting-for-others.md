# Acting for someone else

Who may sign someone else up for a meal, a ride or a trip day, or log an
expense in their name?

**Current rule:** members may sign anyone up for a meal, a ride seat, a restaurant car,
a trip day or a hotel room, and take them off again. Things that belong to one person
stay restricted to that person (or an admin): who paid an expense, location pings and
cosplays. Deletes always need the creator or an admin.

This was a choice between two options; the other one ("members only act for themselves")
is described at the bottom, in case it needs to come back.

## How it's enforced

- **Backend:** two helpers in `backend/app/dependencies.py` decide who an action is for:
  - `act_for_anyone(current_user, requested)` returns the requested name, or your own
    when none is given. Used for the sign-ups above: meals (RSVP, cancel), rides (claim or
    leave a seat, restaurant drivers and assignments), trip days (RSVP, leave) and hotel
    rooms (create with occupants, assign, leave).
  - `act_as(current_user, requested)` is the strict one: your own name (or a former name
    of yours that no other profile uses), or anyone for an admin. Used for `paid_by` on an
    expense, location pings, creating a cosplay and the driver of a new ride.
  - Settle-up (`/api/settlements`) uses neither: a settlement is always started, paid and
    confirmed as the signed-in member, because it involves their bank details. An admin who
    needs to act there has to use "log in as" ([security.md](security.md#log-in-as)).
- **Frontend:** the name pickers for the sign-ups offer every name. `useActingPermissions()`
  in `frontend/src/hooks/useUsers.ts` mirrors `act_as` and is still used by the pickers
  for the restricted things (`CreateExpenseDrawer`, `LocationPingModal`, `TripCosplayTab`,
  `CosplayDetailView`):
  - `actable(names)` filters a list of names;
  - `canActFor(name)` checks one name.

Because anyone can be signed up or off without their consent, consider logging who made
each change if that ever becomes a problem.

## Going back to "members only act for themselves"

Use `act_as` instead of `act_for_anyone` in the endpoints above (they are the ones that
call `act_for_anyone`), and wrap the name pickers in `actable(...)` again.
