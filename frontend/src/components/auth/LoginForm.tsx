import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "../common/Button";
import { login } from "../../services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  passphrase: z.string().min(1, "Vul de toegangscode in"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const data = await login({ passphrase: values.passphrase });
      setAccessToken(data.access_token);
      navigate("/", { replace: true });
    } catch {
      setError("passphrase", { message: "Onjuiste toegangscode. Probeer opnieuw." });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            className={`input-field pl-11 ${errors.passphrase ? "border-rose-400 ring-3 ring-rose-100" : ""}`}
            {...register("passphrase")}
          />
        </div>
        {errors.passphrase && (
          <p className="mt-2 text-xs font-medium text-rose-500">
            {errors.passphrase.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        loading={isSubmitting}
        className="w-full"
      >
        Inloggen
        {!isSubmitting && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
