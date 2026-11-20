import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7,
      alternates: { languages: { "zh-CN": `${SITE_URL}/about`, en: `${SITE_URL}/en/about` } },
    },
    {
      url: `${SITE_URL}/en/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7,
      alternates: { languages: { "zh-CN": `${SITE_URL}/about`, en: `${SITE_URL}/en/about` } },
    },
    {
      url: `${SITE_URL}/start`, lastModified: now, changeFrequency: "monthly", priority: 0.9,
      alternates: { languages: { "zh-CN": `${SITE_URL}/start`, en: `${SITE_URL}/en/start` } },
    },
    {
      url: `${SITE_URL}/en/start`, lastModified: now, changeFrequency: "monthly", priority: 0.9,
      alternates: { languages: { "zh-CN": `${SITE_URL}/start`, en: `${SITE_URL}/en/start` } },
    },
    {
      url: `${SITE_URL}/workshop`, lastModified: now, changeFrequency: "weekly", priority: 0.8,
      alternates: { languages: { "zh-CN": `${SITE_URL}/workshop`, en: `${SITE_URL}/en/workshop` } },
    },
    {
      url: `${SITE_URL}/en/workshop`, lastModified: now, changeFrequency: "weekly", priority: 0.8,
      alternates: { languages: { "zh-CN": `${SITE_URL}/workshop`, en: `${SITE_URL}/en/workshop` } },
    },
    {
      url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5,
      alternates: { languages: { "zh-CN": `${SITE_URL}/contact`, en: `${SITE_URL}/en/contact` } },
    },
    {
      url: `${SITE_URL}/en/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5,
      alternates: { languages: { "zh-CN": `${SITE_URL}/contact`, en: `${SITE_URL}/en/contact` } },
    },
  ];
  // /xiaoqun、/hanzi、/reader 需要登录，不进 sitemap
  return fixed;
}
