export type DialoguePhase = "talking" | "con-count" | "birthyear" | "reacting" | "ready";

export interface ProfileState {
  pronouns: string;
  bio: string;
  phone: string;
  color: string;
  bannerColor: string;
  allowDm: boolean;
  aliases: string[];
}
