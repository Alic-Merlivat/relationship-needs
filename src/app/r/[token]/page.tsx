import Link from "next/link";
import { notFound } from "next/navigation";
import { SavedResultsView } from "@/app/r/[token]/SavedResultsView";
import { isDatabaseConfigured } from "@/lib/db/client";
import { resolveAccessToken } from "@/lib/server/assessmentStore";

export const dynamic = "force-dynamic";

/** Private results, addressed by the token from the person's own email. */
export default async function SavedResultsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isDatabaseConfigured()) notFound();

  const { token } = await params;
  const access = await resolveAccessToken(token);

  if (!access) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">
          This link has expired
        </h1>
        <p className="text-sm leading-relaxed text-stone-500">
          Results links work for 30 days. You can have a fresh one emailed to
          you, or take the assessment again.
        </p>
        <Link
          href="/recover"
          className="rounded-full bg-stone-800 px-5 py-2.5 text-sm font-medium text-white"
        >
          Email me a new link
        </Link>
        <Link href="/" className="text-xs font-medium text-rose-400">
          Back to the start
        </Link>
      </main>
    );
  }

  const invitation = access.sentInvitation;

  return (
    <SavedResultsView
      token={token}
      history={access.assessment.history}
      name={access.assessment.participantName}
      partnerName={access.partner?.participantName ?? null}
      invitation={
        invitation
          ? { email: invitation.inviteeEmail, status: invitation.status }
          : null
      }
      wasInvited={Boolean(access.receivedInvitation)}
    />
  );
}
