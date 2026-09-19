import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

// PKCE: the OAuth provider sends back a one-time code (exchanged by
// supabase-js on load) instead of putting the tokens themselves in the URL,
// where they'd end up in browser history.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { flowType: "pkce" },
});
