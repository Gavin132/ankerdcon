import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, ArrowRight, User } from "lucide-react";
import { Button } from "../common/Button";
import { login } from "../../services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import { usePublicUserNames } from "../../hooks/useUsers";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  user_name: z.string().min(1, "Selecteer je naam"),
  passcode: z.string().min(1, "Vul je toegangscode in"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const navigate = useNavigate();
  const { data: names = [], isLoading: namesLoading } = usePublicUserNames();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const data = await login({ user_name: values.user_name, passcode: values.passcode });
      setAccessToken(data.access_token);
      navigate("/", { replace: true });
    } catch {
      setError("passcode", { message: "Onjuiste naam of toegangscode. Probeer opnieuw." });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name picker */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
          Jouw naam
        </label>
        <div className="relative">
          <User
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <select
            className={`input-field pl-11 ${errors.user_name ? "border-rose-400 ring-2 ring-rose-100" : ""}`}
            disabled={namesLoading}
            {...register("user_name")}
          >
            <option value="">
              {namesLoading ? "Laden…" : "Selecteer je naam…"}
            </option>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {errors.user_name && (
          <p className="mt-2 text-xs font-medium text-rose-500">
            {errors.user_name.message}
          </p>
        )}
      </div>

      {/* Passcode */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
          Toegangscode
        </label>
        <div className="relative">
          <Lock
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className={`input-field pl-11 ${errors.passcode ? "border-rose-400 ring-2 ring-rose-100" : ""}`}
            {...register("passcode")}
          />
        </div>
        {errors.passcode && (
          <p className="mt-2 text-xs font-medium text-rose-500">
            {errors.passcode.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Inloggen
        {!isSubmitting && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
