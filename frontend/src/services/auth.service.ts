import { supabase } from "./supabase";
import { PENDING_DISCORD_LINK_KEY } from "../store/auth.store";

// We no longer need a custom `login` or `refresh` function!
// - Login is handled by the Discord OAuth button in LoginForm.tsx
// - Refresh is handled completely invisibly by the Supabase client in the background.

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error logging out:", error.message);
  }
}

/** Attaches a Discord identity to the current session's account (for a user
 * who signed in with Google) via Supabase's linkIdentity flow — sends the
 * browser to Discord and back, same as a normal login redirect. */
export async function startDiscordLink(): Promise<void> {
  try {
    sessionStorage.setItem(PENDING_DISCORD_LINK_KEY, "1");
  } catch {
    // sessionStorage unavailable — link still works, just won't auto-sync after the redirect
  }
  const { error } = await supabase.auth.linkIdentity({
    provider: "discord",
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    try { sessionStorage.removeItem(PENDING_DISCORD_LINK_KEY); } catch { /* ignore */ }
    throw error;
  }
}