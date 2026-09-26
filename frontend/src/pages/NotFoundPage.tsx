import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { routes } from "../config/routes";
import { APP_NAME } from "../constants";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-paper px-6 py-12 select-none">
      <motion.div
        className="flex max-w-sm flex-col items-center text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <img
          src="/assets/images/ankerd-logo.webp"
          alt=""
          className="mb-5 h-16 w-16 object-contain"
          draggable={false}
        />

        <h1 className="font-display text-[96px] font-extrabold uppercase leading-[0.85] text-ink">
          404
        </h1>
        <p className="mt-3 font-display text-[26px] font-extrabold uppercase leading-[0.95] text-ink">
          Pagina niet gevonden
        </p>
        <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-ink-2">
          Dit anker is losgeslagen. De pagina bestaat niet (meer) in {APP_NAME}.
        </p>

        <button
          onClick={() => navigate(routes.hub, { replace: true })}
          className="btn-primary mt-7 px-5 py-2.5 text-sm"
        >
          Terug naar hub
        </button>
      </motion.div>
    </div>
  );
}
