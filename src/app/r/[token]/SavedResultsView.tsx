"use client";

import Link from "next/link";
import { useState } from "react";
import { RankedNeedResults } from "@/components/RankedNeedResults";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import type { InvitationStatus } from "@/lib/db/schema";
import { whatsAppInviteUrl } from "@/lib/whatsapp";

interface Props {
  token: string;
  history: ComparisonRecord[];
  selectedIds: string[];
  name: string;
  partnerName: string | null;
  /** `email` is null for a WhatsApp-shared invitation — no address was ever typed. */
  invitation: { email: string | null; status: InvitationStatus } | null;
  wasInvited: boolean;
}

export function SavedResultsView({
  token,
  history,
  selectedIds,
  name,
  partnerName,
  invitation,
  wasInvited,
}: Props) {
  const [status, setStatus] = useState<InvitationStatus | null>(
    invitation?.status ?? null
  );
  const [busy, setBusy] = useState<"revoke" | "resend" | "share" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Real link rendered as a fallback in case the automatic window.open()
  // below gets blocked — an <a> the person taps themselves always works.
  const [waLink, setWaLink] = useState<string | null>(null);

  async function manage(action: "revoke" | "resend" | "share") {
    setBusy(action);
    setNotice(null);
    if (action === "share") setWaLink(null);
    try {
      const response = await fetch("/api/invitations/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "That didn't work. Please try again.");
      } else if (action === "revoke") {
        setStatus("REVOKED");
        setNotice("Invitation cancelled.");
      } else if (action === "share") {
        const link = whatsAppInviteUrl(data.url);
        setWaLink(link);
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        setNotice("Invitation sent again.");
      }
    } catch {
      setNotice("That didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-3 px-4 pt-3"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-none items-center justify-between">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm"
        >
          ‹
        </Link>
        <h1 className="font-serif text-lg font-semibold text-stone-800">
          {name}&apos;s needs
        </h1>
        <span className="w-8" />
      </div>

      <RankedNeedResults history={history} selectedIds={selectedIds} />

      {partnerName && (
        <Link
          href={`/r/${token}/compare`}
          className="flex flex-none items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
        >
          <span className="flex flex-col gap-0.5 text-left">
            <span className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
              Your comparison
            </span>
            <span className="text-xs text-stone-600">
              See where you and {partnerName} line up.
            </span>
          </span>
          <span className="flex-none text-stone-300">›</span>
        </Link>
      )}

      {invitation && !partnerName && status === "PENDING" && (
        <div className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            Waiting on your partner
          </p>
          <p className="text-xs leading-relaxed text-stone-500">
            {invitation.email ? (
              <>
                We invited <span className="font-medium">{invitation.email}</span>.
                You&apos;ll both be able to see the comparison once they finish.
              </>
            ) : (
              <>
                You shared an invite link. You&apos;ll both be able to see the
                comparison once they finish their assessment.
              </>
            )}
          </p>
          <button
            onClick={() => manage("share")}
            disabled={busy !== null}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy === "share" ? "Getting your link…" : "Share via WhatsApp"}
          </button>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-[11px] font-medium text-emerald-600 underline"
            >
              Nothing opened? Tap here
            </a>
          )}
          <div className="flex gap-2">
            {invitation.email && (
              <button
                onClick={() => manage("resend")}
                disabled={busy !== null}
                className="flex-1 rounded-full border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 disabled:opacity-60"
              >
                {busy === "resend" ? "Sending…" : "Send again by email"}
              </button>
            )}
            <button
              onClick={() => manage("revoke")}
              disabled={busy !== null}
              className="flex-1 rounded-full border border-stone-200 px-3 py-2 text-xs font-medium text-rose-500 disabled:opacity-60"
            >
              {busy === "revoke" ? "Cancelling…" : "Cancel invite"}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-400">
            Each of these replaces the earlier link, so only the newest one
            will work.
          </p>
          {notice && <p className="text-xs font-medium text-stone-600">{notice}</p>}
        </div>
      )}

      {invitation && status === "REVOKED" && (
        <div className="flex flex-none flex-col gap-1 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            Invitation cancelled
          </p>
          <p className="text-xs leading-relaxed text-stone-500">
            {invitation.email
              ? `The link we sent to ${invitation.email} no longer works.`
              : "The link you shared no longer works."}
          </p>
        </div>
      )}

      {!invitation && !wasInvited && (
        <div className="flex flex-none flex-col gap-1 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            Private to you
          </p>
          <p className="text-xs leading-relaxed text-stone-500">
            Anyone with this link can see these results, so keep it to
            yourself. It works for 30 days.
          </p>
        </div>
      )}
    </main>
  );
}
