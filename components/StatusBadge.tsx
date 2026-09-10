import type { ComputedStatus } from "@/lib/status";
import { STATUS_CLASS, statusSentence } from "@/lib/format";

export function StatusBadge({ status, className = "" }: { status: ComputedStatus; className?: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status.code]} ${className}`}>
      {statusSentence(status)}
    </span>
  );
}

export function VerifiedBadge({ verified_by, verified_at }: { verified_by: string | null; verified_at: string | null }) {
  if (verified_by) {
    return (
      <span className="inline-block rounded border border-emerald-600/40 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-200">
        Verified by {verified_by} on {verified_at}
      </span>
    );
  }
  return (
    <span className="inline-block rounded border border-amber-600/40 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
      Unverified draft — not yet checked by a person
    </span>
  );
}
