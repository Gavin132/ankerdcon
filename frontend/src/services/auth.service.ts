import { supabase } from "./supabase";

// We no longer need a custom `login` or `refresh` function!
// - Login is handled by the Discord OAuth button in LoginForm.tsx
// - Refresh is handled completely invisibly by the Supabase client in the background.

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error logging out:", error.message);
  }
}