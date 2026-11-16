import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/config";

// 不挡 AI 爬虫（GEO）；只挡私有区：驾驶舱、接口、登录、读读乐。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/plan", "/api/", "/login", "/reader", "/xiaoqun", "/hanzi"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
