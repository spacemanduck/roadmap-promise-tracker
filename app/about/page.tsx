import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "What this site is, what it is not, and where the data lives.",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">About</h1>
      <p className="leading-relaxed">
        This site keeps a record of what live-service publishers put on their public roadmaps and what happened next. It is a
        receipts dataset presented without commentary: every item cites the archived roadmap it came from and the patch note it was
        matched to, windows are normalised by a published rubric, and status is computed from dates rather than written by anyone.
      </p>
      <h2 className="text-lg font-semibold">What it is not</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>It does not reproduce roadmap graphics. Only extracted text, hashes and archive links are stored.</li>
        <li>It does not use fan posts, social media or wikis as sources. They may point us at a page; the page is the source.</li>
        <li>It does not rate publishers. It shows a count and the denominator, and links to the evidence.</li>
      </ul>
      <h2 className="text-lg font-semibold">Where the data lives</h2>
      <p className="text-sm leading-relaxed">
        Every record is a JSON file in a public repository, with the rubric alongside it. The site is rebuilt from those files. A
        weekly job captures each tracked roadmap, archives it, extracts the items, matches deliveries to new patch notes and opens a
        pull request for a person to review.{" "}
        <a href={REPO_URL} className="underline">
          Source and data
        </a>
        .
      </p>
      <p className="text-sm text-muted">
        Read the{" "}
        <Link href="/roadmaps/methodology" className="underline">
          methodology
        </Link>{" "}
        or the{" "}
        <Link href="/corrections" className="underline">
          corrections route
        </Link>
        .
      </p>
    </div>
  );
}
