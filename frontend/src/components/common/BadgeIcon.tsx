import type { Badge } from "../../types";

interface BadgeIconProps {
  badge: Badge;
  size?: "sm" | "md";
}

export function BadgeIcon({ badge, size = "sm" }: BadgeIconProps) {
  const dim = size === "sm" ? 20 : 28;

  return (
    <img
      src={badge.image_url}
      alt={badge.name}
      title={badge.description}
      width={dim}
      height={dim}
      style={{ width: dim, height: dim, flexShrink: 0, objectFit: "contain" }}
    />
  );
}
