/** Percent hotspots for `public/art/home-room.jpg` (modern cozy room, 3:4). */
export type HomeHotspot = {
  href: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export const HOME_HOTSPOTS: HomeHotspot[] = [
  // Framed photo collage — left wall
  { href: "/album", label: "Альбом", left: 4, top: 6, width: 40, height: 28 },
  // Wall calendar
  { href: "/calendar", label: "Календарь", left: 46, top: 8, width: 16, height: 22 },
  // Glowing constellation lightbox
  { href: "/constellation", label: "Созвездие", left: 64, top: 10, width: 18, height: 20 },
  // Game controller on right shelf
  { href: "/games", label: "Игры", left: 78, top: 36, width: 18, height: 16 },
  // Heart cushion on sofa
  { href: "/pings", label: "Сигналы", left: 70, top: 48, width: 22, height: 12 },
  // Open notebook + pink/blue pens
  { href: "/diary", label: "Дневник", left: 26, top: 56, width: 28, height: 14 },
  // Smartphone with chat bubbles
  { href: "/chat", label: "Чат", left: 52, top: 60, width: 18, height: 12 },
  // Open city map for date places
  { href: "/map", label: "Свидания", left: 28, top: 68, width: 28, height: 12 },
  // Tied cream envelopes
  { href: "/letters", label: "Письма", left: 58, top: 72, width: 24, height: 14 },
];
