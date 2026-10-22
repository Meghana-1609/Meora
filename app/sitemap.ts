import type { MetadataRoute } from "next";
// The page search engines should list.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://meora.vercel.app/", changeFrequency: "weekly", priority: 1 }];
}
