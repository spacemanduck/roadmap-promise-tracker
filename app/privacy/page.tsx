import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What this site collects: aggregate page-view analytics with no cookies, and nothing else.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <p className="leading-relaxed">
        This site is static. It sets no cookies, has no accounts, and runs no forms. If aggregate page-view analytics are enabled
        they are cookie-free and record page paths and coarse referrers, not individuals.
      </p>
      <p className="leading-relaxed text-sm">
        Requests and corrections are handled through a public issue tracker hosted by GitHub, whose own privacy policy applies to
        anything you post there.
      </p>
      <p className="leading-relaxed text-sm">
        The data on the site is about publishers&apos; public statements and is not about people. Names that appear on a row (for
        example, who verified it) are the names of the people who maintain the dataset.
      </p>
    </div>
  );
}
