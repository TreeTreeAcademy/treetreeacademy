"use client";
import { useState } from "react";
import { SPH_ID } from "@/lib/site/social";

export default function SphCopy() {
  const [ok, setOk] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(SPH_ID); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* ignore */ }
  }
  return (
    <span className="soc-sph">
      视频号：搜索 ID <code>{SPH_ID}</code>
      <button type="button" className="soc-copy" onClick={copy} aria-label="复制视频号 ID">{ok ? "已复制" : "复制"}</button>
    </span>
  );
}
