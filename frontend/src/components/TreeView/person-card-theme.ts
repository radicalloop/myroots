import { Gender } from "@/types/api.types";

export type PersonCardAvatarVariant = "default" | "female";

export interface PersonCardTheme {
  avatarVariant: PersonCardAvatarVariant;
  card: string;
  cardHighlighted: string;
  cardHoverBorder: string;
  ring: string;
  ringHighlighted: string;
  ringHover: string;
  statusDot: string;
  lastName: string;
  birthBadge: string;
  showHeartDivider: boolean;
  showDecorations: boolean;
}

const maleTheme: PersonCardTheme = {
  avatarVariant: "default",
  card: "border-[#edf0eb] bg-white hover:border-brand-200",
  cardHighlighted:
    "border-2 border-brand-500 shadow-[0_0_0_5px_rgba(16,185,129,0.14),0_24px_52px_rgba(31,41,35,0.12)]",
  cardHoverBorder: "hover:border-brand-200",
  ring: "bg-[conic-gradient(from_150deg,#dcefd0_0deg,#d8f1e6_360deg,transparent_360deg)]",
  ringHighlighted: "ring-4 ring-brand-100",
  ringHover: "group-hover:ring-4 group-hover:ring-brand-50",
  statusDot: "bg-[#3690b8]",
  lastName: "text-[#969d90]",
  birthBadge: "bg-[#f1f4f0] text-[#68806b]",
  showHeartDivider: false,
  showDecorations: false,
};

const femaleTheme: PersonCardTheme = {
  avatarVariant: "female",
  card: "border-pink-100/90 bg-gradient-to-b from-white via-white to-pink-50/70 hover:border-pink-200",
  cardHighlighted:
    "border-2 border-pink-400 shadow-[0_0_0_5px_rgba(236,72,153,0.16),0_24px_52px_rgba(236,72,153,0.14)]",
  cardHoverBorder: "hover:border-pink-200",
  ring: "bg-[conic-gradient(from_150deg,#fce7f3_0deg,#fbcfe8_120deg,#f9a8d4_280deg,#fce7f3_360deg)] shadow-[0_0_28px_rgba(244,114,182,0.35)]",
  ringHighlighted: "ring-4 ring-pink-100",
  ringHover: "group-hover:ring-4 group-hover:ring-pink-50",
  statusDot: "bg-pink-500",
  lastName: "text-pink-400",
  birthBadge: "bg-pink-50 text-pink-600",
  showHeartDivider: true,
  showDecorations: true,
};

export function getPersonCardTheme(gender: Gender): PersonCardTheme {
  return gender === Gender.FEMALE ? femaleTheme : maleTheme;
}
