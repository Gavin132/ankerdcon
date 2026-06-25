import { useNavigate } from "react-router-dom";
import { routes } from "../../config/routes";
import { useUser } from "../../hooks/useUsers";

const FONT_MAP: Record<string, string> = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  cursive: "cursive",
  display: 'Impact, "Arial Black", sans-serif',
};

interface UserNameDisplayProps {
  name: string;
  className?: string;
  clickable?: boolean;
}

export function UserNameDisplay({
  name,
  className = "",
  clickable = true,
}: UserNameDisplayProps) {
  const navigate = useNavigate();
  const { data: user } = useUser(name);

  const style: React.CSSProperties = {
    color: user?.color || undefined,
    fontFamily:
      user?.font && user.font !== "default" ? FONT_MAP[user.font] : undefined,
  };

  if (clickable) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate(routes.profile.view(name));
        }}
        className={`text-left hover:opacity-70 transition-opacity ${className}`}
        style={style}
      >
        {name}
      </button>
    );
  }

  return (
    <span className={className} style={style}>
      {name}
    </span>
  );
}
