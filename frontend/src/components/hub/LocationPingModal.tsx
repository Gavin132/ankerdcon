import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin } from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { usePingLocation } from "../../hooks/useUsers";

const ZONES = ["Op locatie", "Hotel", "Onderweg", "Off-site", "Thuis"] as const;

const pingSchema = z.object({
  user_name: z.string().min(1, "Verplicht"),
  zone: z.string().min(1, "Selecteer een zone"),
  text: z.string().min(1, "Voer details in"),
});
type PingForm = z.infer<typeof pingSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  userNames: string[];
}

export function LocationPingModal({ open, onClose, userNames }: Props) {
  const pingMutation = usePingLocation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PingForm>({ resolver: zodResolver(pingSchema) });

  async function onPing(values: PingForm) {
    await pingMutation.mutateAsync(values);
    reset({});
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Locatie pingen"
      description="Stuur een snelle update naar de groep"
    >
      <form onSubmit={handleSubmit(onPing)} className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
            Jouw naam
          </label>
          <NamePicker
            options={userNames}
            value={watch("user_name") ?? ""}
            onChange={(v) => setValue("user_name", v)}
            color="sky"
          />
          {errors.user_name && (
            <p className="mt-1.5 text-xs text-rose-500">
              {errors.user_name.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
            Zone
          </label>
          <select className="input-field" {...register("zone")}>
            <option value="">Selecteer zone…</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          {errors.zone && (
            <p className="mt-1.5 text-xs text-rose-500">
              {errors.zone.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
            Details
          </label>
          <input
            className="input-field"
            placeholder="Bijv. Hal B, ingang links"
            {...register("text")}
          />
          {errors.text && (
            <p className="mt-1.5 text-xs text-rose-500">
              {errors.text.message}
            </p>
          )}
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">
          <MapPin size={16} />
          Pingen
        </Button>
      </form>
    </Modal>
  );
}
