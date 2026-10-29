import { useNavigate } from "react-router-dom";
import { routes } from "../config/routes";
import { APP_NAME } from "../constants";
import { StatusScreen } from "../components/common/StatusScreen";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <StatusScreen
      kicker="Fout 404"
      mark="logo"
      title="Pagina niet gevonden"
      actions={
        <button onClick={() => navigate(routes.hub, { replace: true })} className="btn-primary px-5 py-2.5 text-sm">
          Terug naar hub
        </button>
      }
    >
      <p>Dit anker is losgeslagen. De pagina bestaat niet (meer) in {APP_NAME}.</p>
    </StatusScreen>
  );
}
