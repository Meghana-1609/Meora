import type { MetadataRoute } from "next";
// Lets search engines read the public pages, never the private admin page or the data API.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }], sitemap: "https://meora.vercel.app/sitemap.xml" };
}
