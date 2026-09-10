import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How roadmap windows are normalised, how status is computed, and what counts as a source. Published verbatim from the repository.",
};

export default function MethodologyPage() {
  const md = fs.readFileSync(path.join(process.cwd(), "docs", "roadmap-methodology.md"), "utf8");
  const html = marked.parse(md, { async: false }) as string;
  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Methodology</h1>
        <p className="max-w-2xl leading-relaxed text-muted">
          This page is the rubric the site runs on, rendered from the same file the code reads. If a row says <em>late</em> or{" "}
          <em>dropped</em>, the rules below are why. They are written so that a publisher can look at any row and see exactly how it
          was coded, and so that a reader can check the row against the archived source without trusting us.
        </p>
        <p className="max-w-2xl leading-relaxed text-muted">
          Two things to keep in mind. First, ambiguity is always read in the publisher&apos;s favour. Second, the only judgement call
          on the site is <em>scope changed</em>, and it never appears without a written reason.
        </p>
      </header>
      <div className="prose-doc max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
