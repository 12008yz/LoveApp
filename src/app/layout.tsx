import type { Metadata, Viewport } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const display = Source_Serif_4({
  variable: "--font-fraunces",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LoveApp",
  description: "Общий мир для двоих — чат, дневник, воспоминания и игры",
  applicationName: "LoveApp",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LoveApp",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#b4234a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${display.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
