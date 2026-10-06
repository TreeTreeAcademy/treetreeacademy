import fs from "fs";
import path from "path";
import type { Episode } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "xiaoqun");

export function getAllEpisodes(): Episode[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".json"));

  const episodes: Episode[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    return JSON.parse(raw) as Episode;
  });

  // Newest first: by date desc, then episode desc
  return episodes.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.episode - a.episode;
  });
}

export function getEpisodeBySlug(slug: string): Episode | undefined {
  return getAllEpisodes().find((ep) => ep.slug === slug);
}

export function getLatestEpisode(): Episode | undefined {
  const all = getAllEpisodes();
  return all[0];
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

export function themeLabels(ep: Episode): string {
  return ep.themes.map((t) => `${t.category}《${t.title}》`).join("；");
}
