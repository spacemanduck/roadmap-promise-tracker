import { createHash } from "node:crypto";
import type { ExtractedItem } from "@/schema/roadmap";

/** Deterministic hash over the extraction (not the page bytes, which churn with ads and nav). */
export function hashExtraction(items: ExtractedItem[]): string {
  const canon = [...items]
    .sort((a, b) => a.position - b.position)
    .map((i) => `${i.item_key}${i.title_as_stated.trim()}${i.window_as_stated.trim()}`)
    .join("\n");
  return "sha256:" + createHash("sha256").update(canon, "utf8").digest("hex");
}
