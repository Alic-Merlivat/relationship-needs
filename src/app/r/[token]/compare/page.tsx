import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparisonView } from "@/app/r/[token]/compare/ComparisonView";
import { isDatabaseConfigured } from "@/lib/db/client";
import { resolveAccessToken } from "@/lib/server/assessmentStore";

export const dynamic = "force-dynamic";

/**
 * The shared comparison.
 *
 * Reachable from either person's own results token — the partner
 * relationship is traversed server-side, so neither of them ever holds the
 * other's credential. Renders only once both assessments exist.
 */
export default async function ComparePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isDatabaseConfigured()) notFound();

  const { token } = await params;
  const access = await resolveAccessToken(token);
  if (!access) notFound();

  if (!access.partner) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">
          Not ready yet
        </h1>
        <p className="text-sm leading-relaxed text-stone-500">
          Your partner hasn&apos;t finished their assessment. Once they do,
          you&apos;ll both be able to see this.
        </p>
        <Link
          href={`/r/${token}`}
          className="rounded-full bg-stone-800 px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to my results
        </Link>
      </main>
    );
  }

  return (
    <ComparisonView
      token={token}
      you={{
        name: access.assessment.participantName,
        history: access.assessment.history,
      }}
      them={{
        name: access.partner.participantName,
        history: access.partner.history,
      }}
    />
  );
}
