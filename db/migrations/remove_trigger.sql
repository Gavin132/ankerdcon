-- Removes the old "create a profile for every new login" trigger.
--
-- This file used to drop the trigger and then create it again. With that
-- trigger live, every Discord or Google account that signs in gets a
-- profile straight away, and the backend finds that profile before it ever
-- checks the whitelist. Profiles are created by the backend only, after the
-- whitelist check. See also migration_v2.23_login_hardening.sql.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
