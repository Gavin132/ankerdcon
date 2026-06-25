import { useState } from "react";
import { useUsers } from "../../hooks/useUsers";
import { avatarColor, personInitial } from "../../utils/avatar";

interface UserAvatarProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UserAvatar({
  name,
  className = "h-6 w-6 text-[9px]",
  style,
}: UserAvatarProps) {
  const { data: users } = useUsers();
  const [imgError, setImgError] = useState(false);

  const user = users?.find((u) => u.name === name || u.discord_username === name);
  const useInlineColor = user?.color && user.color.startsWith("#");
  const showImg = !!user?.avatar_url && !imgError;

  const sharedClass = `flex shrink-0 items-center justify-center rounded-full border-2 border-white font-black text-white shadow-sm ${className}`;

  if (showImg) {
    return (
      <img
        src={user.avatar_url}
        alt={name}
        title={name}
        className={`${sharedClass} object-cover`}
        style={style}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${sharedClass} ${!useInlineColor ? `bg-gradient-to-br ${avatarColor(name)}` : ""}`}
      style={{
        ...(useInlineColor ? { backgroundColor: user.color, backgroundImage: "none" } : {}),
        ...style,
      }}
    >
      {personInitial(name)}
    </div>
  );
}