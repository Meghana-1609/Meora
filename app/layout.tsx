import type { Metadata, Viewport } from "next";
import "@fontsource-variable/outfit";
import "@fontsource-variable/noto-sans-telugu";
import "@fontsource-variable/noto-sans-tamil";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

const SITE = "https://meora.vercel.app";
const DESC = "Meora is a free, private memory app for families. Save anything by speaking, in any language, and anyone in your family can ask for it later. End-to-end encrypted, simple enough for grandparents.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Meora · Your family's brain",
  description: DESC,
  applicationName: "Meora",
  keywords: ["Meora", "Meora app", "family memory app", "family notes", "voice notes for family", "elderly friendly app", "private family app", "encrypted family app"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: SITE, siteName: "Meora", title: "Meora · Your family's brain", description: DESC, images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Meora" }] },
  twitter: { card: "summary", title: "Meora · Your family's brain", description: DESC, images: ["/icons/icon-512.png"] },
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

// Tells Google what Meora is, so it can show it properly in search.
const LD = JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name: "Meora", alternateName: "Meora app", url: SITE, description: DESC, applicationCategory: "LifestyleApplication", operatingSystem: "Android, iOS, Windows, macOS", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, inLanguage: ["en", "te", "hi", "ta", "es", "fr", "ar", "zh"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="t2" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: INSTALL }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LD }} /></head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
