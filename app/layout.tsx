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

// "Install as app" is offered only where the browser installs it cleanly (Chrome on Android, and every
// browser on iPhone, iPad and computers). Other Android browsers build their own app package, which some
// phones flag with a false security warning, so there Meora is added as a normal home-screen shortcut instead.
const INSTALL = `(function(){try{var u=navigator.userAgent,a=/Android/i.test(u);
var other=/SamsungBrowser|EdgA|OPR|Opera|OPT\\/|YaBrowser|UCBrowser|MiuiBrowser|XiaoMi|HeyTap|OppoBrowser|VivoBrowser|HuaweiBrowser|DuckDuckGo|Firefox|FxiOS|; wv\\)|FBAN|FBAV|Instagram|Line\\/|Snapchat|GSA\\//i.test(u);
if(!a||(/Chrome\\/\\d+/.test(u)&&!other&&!navigator.brave)){var l=document.createElement('link');l.rel='manifest';l.href='/manifest.webmanifest';document.head.appendChild(l);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="t2" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: INSTALL }} /></head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
