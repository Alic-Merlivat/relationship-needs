import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteLanding } from "@/app/invite/[token]/InviteLanding";
import { isDatabaseConfigured } from "@/lib/db/client";
import { resolveInvitationToken } from "@/lib/server/assessmentStore";

export const dynamic = "force-dynamic";

/** Where an invited partner arrives from their email. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isDatabaseConfigured()) notFound();

  const { token } = await params;
  const resolved = await resolveInvitationToken(token);

  if (!resolved) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">
          This invitation isn&apos;t active
        </h1>
        <p className="text-sm leading-relaxed text-stone-500">
          It may have expired, been cancelled, or been replaced by a newer
          one. Ask your partner to send it again.
        </p>
        <Link href="/" className="text-xs font-medium text-rose-400">
          Take the assessment on my own
        </Link>
      </main>
    );
  }

  if (resolved.invitation.status === "COMPLETED") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">
          Already done
        </h1>
        <p className="text-sm leading-relaxed text-stone-500">
          This invitation has already been completed. Check your email for
          your own private results link.
        </p>
      </main>
    );
  }

  return (
    <InviteLanding
      token={token}
      inviterName={resolved.inviter.participantName}
      inviterEmail={resolved.inviter.participantEmail}
      inviteeEmail={resolved.invitation.inviteeEmail}
    />
  );
}
