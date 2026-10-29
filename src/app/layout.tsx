import type { Metadata, Viewport } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
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
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "LoveApp",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // Default light; ThemeProvider / boot script override to match user preference.
  themeColor: "#b4234a",
  width: "device-width",
  initialScale: 1,
};

const themeBootScript = `(function(){try{var k="loveapp-theme";var p=localStorage.getItem(k)||"light";var d=p==="dark"?"dark":p==="light"?"light":(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",d);var c=d==="dark"?"#0f1218":"#b4234a";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c);});}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${manrope.variable} h-full`}
      suppressHydrationWarning
      data-theme="light"
    >
      <body className="min-h-full antialiased">
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        <Providers>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
