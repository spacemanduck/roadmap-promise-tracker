/**
 * Roadmap item extraction with Claude — text pages and roadmap images.
 *
 * The model returns ONLY the fields in ExtractionSchema: item keys, titles as stated, windows as
 * stated. It is instructed not to normalise, guess or infer dates — that is done mechanically in
 * lib/window.ts so a publisher can see exactly which rule produced each reading.
 */
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ExtractedItem } from "@/schema/roadmap";

export const ExtractionSchema = z.object({
  roadmap_published_at: z
    .string()
    .describe("Publication date of the roadmap as stated on the page, YYYY-MM-DD, or empty string if not stated"),
  covers_start: z.string().describe("Start of the period this roadmap says it covers, YYYY-MM-DD, or empty string"),
  covers_end: z.string().describe("End of the period this roadmap says it covers, YYYY-MM-DD, or empty string"),
  items: z.array(
    z.object({
      item_key: z.string().describe("lowercase-hyphen slug derived from the title, stable across captures"),
      title_as_stated: z.string().describe("The item name exactly as the publisher wrote it"),
      window_as_stated: z
        .string()
        .describe("The timing exactly as written next to the item (e.g. 'February', 'Q4 2025', 'late July', 'TBA'). If none, write 'no stated window'"),
    }),
  ),
  confidence: z.number().min(0).max(1).describe("Your confidence that every roadmap item on the page was captured with the correct window"),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM = `You extract roadmap items from a game publisher's roadmap page or graphic.

An item is a discrete promised deliverable: a feature, mode, map, class, event, raid, system change, platform launch or similar, that the publisher lists as coming. Do not extract commentary, recaps of things already released, marketing framing, or vague intentions ("we are exploring", "we hope to") — only things the publisher states will arrive.

Rules:
- Quote titles and windows exactly as written. Never normalise a window to a date; never infer a year that is not on the page. If the window is only implied by a section heading (e.g. the item sits under a "February" heading), use the heading text as the window.
- If the page groups items under headings that are periods, every item under that heading takes that heading as its window.
- If an item has no timing at all, write "no stated window".
- item_key: lowercase slug of the title, stable across captures (e.g. "dragonknight-class").
- Preserve page order.
- Set confidence lower if the page is truncated, the image is hard to read, or grouping is ambiguous.`;

export interface ExtractInput {
  model: string;
  /** Text content of the page, when kind is page/post. */
  text?: string;
  /** Path + media type of a roadmap image in a temp dir, when kind is image_in_post. */
  image?: { file: string; media_type: string };
  page_url: string;
  page_title?: string;
}

export async function extractRoadmapItems(input: ExtractInput): Promise<Extraction> {
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    const data = fs.readFileSync(input.image.file).toString("base64");
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.image.media_type as "image/png" | "image/jpeg" | "image/gif" | "image/webp", data },
    });
  }
  const context = [
    `Page URL: ${input.page_url}`,
    input.page_title ? `Page title: ${input.page_title}` : "",
    input.text ? `Page text:\n\n${input.text}` : "The roadmap is the attached image.",
  ]
    .filter(Boolean)
    .join("\n");
  content.push({ type: "text", text: context });

  const response = await client.messages.parse({
    model: input.model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(ExtractionSchema) },
  });
  if (response.stop_reason === "refusal") {
    throw new Error(`extraction refused for ${input.page_url}`);
  }
  if (!response.parsed_output) {
    throw new Error(`extraction returned no parsable output for ${input.page_url}`);
  }
  return response.parsed_output;
}

/** Turn an Extraction into schema-shaped ExtractedItem[] with positions and safe keys. */
export function toExtractedItems(ex: Extraction): ExtractedItem[] {
  const seen = new Set<string>();
  return ex.items.map((it, position) => {
    let key = slugify(it.item_key || it.title_as_stated);
    let n = 2;
    while (seen.has(key)) key = `${slugify(it.item_key || it.title_as_stated)}-${n++}`;
    seen.add(key);
    return {
      item_key: key,
      title_as_stated: it.title_as_stated.trim(),
      window_as_stated: it.window_as_stated.trim() || "no stated window",
      position,
    };
  });
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}
