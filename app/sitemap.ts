import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/start`, lastModified: now, changeFrequency: "monthly", priority: 0.9,
      alternates: { languages: { "zh-CN": `${SITE_URL}/start`, en: `${SITE_URL}/en/start` } },
    },
    {
      url: `${SITE_URL}/en/start`, lastModified: now, changeFrequency: "monthly", priority: 0.9,
      alternates: { languages: { "zh-CN": `${SITE_URL}/start`, en: `${SITE_URL}/en/start` } },
    },
    { url: `${SITE_URL}/workshop`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];
  // /xiaoqun、/hanzi、/reader 需要登录，不进 sitemap
  return fixed;
}
