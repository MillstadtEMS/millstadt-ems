export interface BoardPersonalUser {
  id?: string;
  username?: string;
  firstName: string;
  lastName: string;
  role?: string;
  officerTitle?: string | null;
}

const BOARD_EMOJI_MARKS = [
  "⭐",
  "✨",
  "🧭",
  "📌",
  "✅",
  "📋",
  "💬",
  "📊",
  "🗓️",
  "🛠️",
  "💡",
  "🤝",
  "🩺",
  "⚕️",
  "🚑",
  "🛡️",
  "🏛️",
  "📎",
  "🔎",
  "🧾",
] as const;

function hashUserSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function boardUserEmoji(user: BoardPersonalUser) {
  const seed = [
    user.id,
    user.username,
    user.firstName,
    user.lastName,
    user.role,
    user.officerTitle,
  ].filter(Boolean).join(":").toLowerCase();
  return BOARD_EMOJI_MARKS[hashUserSeed(seed) % BOARD_EMOJI_MARKS.length];
}
