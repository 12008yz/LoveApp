/** Percent hotspots for `public/art/home-room.jpg` (864×1152, 3:4). */
export type HomeHotspot = {
  href: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export const HOME_HOTSPOTS: HomeHotspot[] = [
  // Full mountain painting frame
  { href: "/album", label: "Альбом", left: 4, top: 3, width: 40, height: 30 },
  // Wall calendar only (right of painting)
  { href: "/calendar", label: "Календарь", left: 54, top: 5, width: 17, height: 27 },
  // Three polaroids on string
  { href: "/timeline", label: "История", left: 55, top: 29, width: 30, height: 13 },
  // Floral pillow on sofa (pings)
  { href: "/pings", label: "Пинги", left: 70, top: 44, width: 20, height: 15 },
  // Open notebook + pen
  { href: "/diary", label: "Дневник", left: 22, top: 51, width: 30, height: 17 },
  // Smartphone (further right — was overlapping notebook)
  { href: "/chat", label: "Чат", left: 63, top: 53, width: 20, height: 16 },
  // Folded map (further left — was overlapping letters)
  { href: "/map", label: "Карта", left: 28, top: 68, width: 26, height: 14 },
  // Envelope stack
  { href: "/letters", label: "Письма", left: 66, top: 69, width: 22, height: 15 },
];
