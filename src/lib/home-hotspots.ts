/** Percent hotspots for `public/art/home-room.jpg` (modern cozy room, 3:4). */
export type HomeHotspot = {
  href: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Hit boxes aligned to painted objects (art is 1:1 with stage — no idle CSS scale).
 */
export const HOME_HOTSPOTS: HomeHotspot[] = [
  // Photo collage frame
  { href: "/album", label: "Альбом", left: 5, top: 7, width: 38, height: 27 },
  // Wall calendar grid
  { href: "/calendar", label: "Календарь", left: 50, top: 8, width: 15, height: 18 },
  // Constellation lightbox under the calendar
  { href: "/constellation", label: "Созвездие", left: 52, top: 28, width: 22, height: 16 },
  // Controller on right shelf
  { href: "/games", label: "Игры", left: 80, top: 36, width: 16, height: 15 },
  // Heart pillow
  { href: "/pings", label: "Сигналы", left: 58, top: 44, width: 20, height: 12 },
  // Open notebook
  { href: "/diary", label: "Дневник", left: 20, top: 54, width: 30, height: 12 },
  // Smartphone (not the pens)
  { href: "/chat", label: "Чат", left: 64, top: 56, width: 18, height: 14 },
  // City map with pins
  { href: "/map", label: "Свидания", left: 22, top: 70, width: 34, height: 13 },
  // Envelope stack
  { href: "/letters", label: "Письма", left: 58, top: 74, width: 26, height: 13 },
];
