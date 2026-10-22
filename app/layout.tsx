import type { Metadata, Viewport } from "next";
import "@fontsource-variable/outfit";
import "@fontsource-variable/noto-sans-telugu";
import "@fontsource-variable/noto-sans-tamil";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Meora · Your family's brain",
  description: "Your family's memory in one safe place. Save by speaking, ask anytime, in any language. Only your family can read it. Free.",
  appleWebApp: { capable: true, title: "Meora", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#1D2742", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="t2" suppressHydrationWarning>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
