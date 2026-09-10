import type { Metadata } from "next";
import Link from "next/link";
import { CORRECTION_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Corrections",
  description: "How to get a wrong row fixed, and what happens when you do.",
};

export default function CorrectionsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Corrections</h1>
      <p className="leading-relaxed">
        Every row on this site links to the archived roadmap it was read from and the patch note it was matched to. If a row is
        wrong, one of those links will show why. Corrections are handled in public so the fix is as visible as the error.
      </p>
      <h2 className="text-lg font-semibold">What to send</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>The item URL (or the record id shown at the foot of the item page).</li>
        <li>The publisher page or patch note you believe contradicts the row.</li>
        <li>What you think the row should say.</li>
      </ul>
      <h2 className="text-lg font-semibold">What happens</h2>
      <p className="text-sm leading-relaxed">
        The{" "}
        <Link href="/roadmaps/methodology" className="underline">
          rubric
        </Link>{" "}
        is applied to the source you send, not to the complaint. If the source supports a change, the row is edited, the person who
        checked it is recorded on the row, and the change is visible in the repository history. If it does not, the reply says
        which rule was applied. Publishers get the same route as everyone else.
      </p>
      <p>
        <a href={CORRECTION_URL} className="inline-block rounded bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">
          Open a correction
        </a>
      </p>
    </div>
  );
}
