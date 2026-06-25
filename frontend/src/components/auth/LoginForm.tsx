import { useState, useEffect } from "react";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { supabase } from "../../services/supabase";
import { useAuthStore } from "../../store/auth.store";
import { routes } from "../../config/routes";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Bring in your router and your auth state
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  // The Magic Redirect: If the token suddenly exists, send them to the dashboard!
  useEffect(() => {
    if (accessToken) {
      navigate(routes.hub, { replace: true });
    }
  }, [accessToken, navigate]);

  async function handleDiscordLogin() {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: window.location.origin, 
        }
      });

      if (error) throw error;
      
    } catch (err: any) {
      setError(err.message || "Er is een fout opgetreden bij het inloggen via Discord.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-white">Welkom bij Ankerd Con</h2>
        <p className="text-sm text-slate-400 mt-1">Koppel je account om verder te gaan</p>
      </div>

      <Button 
        type="button" 
        size="lg" 
        onClick={handleDiscordLogin} 
        loading={isLoading} 
        className="w-full bg-[#5865F2] hover:bg-[#4752C4] border-transparent text-white"
      >
        Inloggen met Discord
        {!isLoading && <LogIn size={18} className="ml-2" />}
      </Button>

      {error && (
        <p className="mt-2 text-xs font-medium text-rose-500 text-center">
          {error}
        </p>
      )}
    </div>
  );
}