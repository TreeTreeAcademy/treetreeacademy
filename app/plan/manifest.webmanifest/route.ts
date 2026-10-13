export const dynamic = "force-static";
export function GET() {
  return new Response(JSON.stringify({ name: "成事搭档 驾驶舱", short_name: "成事驾驶舱", start_url: "/plan", scope: "/plan", display: "standalone", background_color: "#faf6ef", theme_color: "#c0794a", icons: [{ src: "/apple-icon.png", sizes: "180x180", type: "image/png" }, { src: "/icon.png", sizes: "512x512", type: "image/png" }] }), { headers: { "Content-Type": "application/manifest+json" } });
}
