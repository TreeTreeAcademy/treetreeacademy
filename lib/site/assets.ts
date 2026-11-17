import { existsSync } from "fs";
import { join } from "path";

// 品牌图片放在 public/brand/。文件不存在时页面显示"待补"占位，而不是破图。
export function asset(path: string): string | null {
  return existsSync(join(process.cwd(), "public", path)) ? path : null;
}

export const PHOTOS = {
  hero: "/brand/jing-explaining.webp",
  about: "/brand/jing-smile.webp",
  workshop: "/brand/jing-heart.webp",
  welcome: "/brand/jing-welcome.webp",
  teaching: [
    { src: "/brand/teach-picnic.webp", alt: "和美国大学生的中文课野餐", altEn: "Chinese class picnic with American college students" },
    { src: "/brand/teach-culture.webp", alt: "大学中国文化活动，晶晶穿旗袍和师生合影", altEn: "Jing in a qipao with a professor and students at a university Chinese culture event" },
    { src: "/brand/teach-papercut.webp", alt: "中文课上的剪纸活动", altEn: "Paper-cutting activity in Chinese class" },
  ],
};
