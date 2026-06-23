import { useUsers } from "../../hooks/useUsers";
import { avatarColor, personInitial } from "../../utils/avatar";

interface UserAvatarProps {
  name: string;
  className?: string; // Allows you to pass custom sizes like 'w-8 h-8'
  style?: React.CSSProperties; // Allows passing custom text sizes
}

export function UserAvatar({ 
  name, 
  className = "h-6 w-6 text-[9px]", // Default small size for lists
  style 
}: UserAvatarProps) {
  // Grab the cached list of all users
  const { data: users } = useUsers();

  // Find this specific person in the list
  const user = users?.find((u) => u.name === name);

  // Check if they have a custom hex color from the database
  const useInlineColor = user?.color && user.color.startsWith("#");

  return (
    <div
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-white font-black text-white shadow-sm ${
        !useInlineColor ? `bg-gradient-to-br ${avatarColor(name)}` : ""
      } ${className}`}
      style={{
        ...(useInlineColor ? { backgroundColor: user.color, backgroundImage: "none" } : {}),
        ...style
      }}
    >
      {personInitial(name)}
    </div>
  );
}