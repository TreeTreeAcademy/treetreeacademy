import type { MetadataRoute } from "next";
import { getAllEpisodes } from "@/lib/episodes";
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
    { url: `${SITE_URL}/xiaoqun`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/hanzi`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
  const eps = getAllEpisodes().map((e) => ({
    url: `${SITE_URL}/xiaoqun/${e.slug}`,
    lastModified: new Date(e.date),
    changeFrequency: "yearly" as const,
    priority: 0.4,
  }));
  return [...fixed, ...eps];
}
