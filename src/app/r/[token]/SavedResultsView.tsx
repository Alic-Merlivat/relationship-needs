"use client";

import Link from "next/link";
import { useState } from "react";
import { CoreNeedResults } from "@/components/CoreNeedResults";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import type { InvitationStatus } from "@/lib/db/schema";

interface Props {
  token: string;
  history: ComparisonRecord[];
  name: string;
  partnerName: string | null;
  invitation: { email: string; status: InvitationStatus } | null;
  wasInvited: boolean;
}

export function SavedResultsView({
  token,
  history,
  name,
  partnerName,
  invitation,
  wasInvited,
}: Props) {
  const [status, setStatus] = useState<InvitationStatus | null>(
    invitation?.status ?? null
  );
  const [busy, setBusy] = useState<"revoke" | "resend" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function manage(action: "revoke" | "resend") {
    setBusy(action);
    setNotice(null);
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

      <CoreNeedResults history={history} />

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
            We invited <span className="font-medium">{invitation.email}</span>.
            You&apos;ll both be able to see the comparison once they finish.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => manage("resend")}
              disabled={busy !== null}
              className="flex-1 rounded-full border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 disabled:opacity-60"
            >
              {busy === "resend" ? "Sending…" : "Send again"}
            </button>
            <button
              onClick={() => manage("revoke")}
              disabled={busy !== null}
              className="flex-1 rounded-full border border-stone-200 px-3 py-2 text-xs font-medium text-rose-500 disabled:opacity-60"
            >
              {busy === "revoke" ? "Cancelling…" : "Cancel invite"}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-400">
            Sending again replaces the earlier link, so only the newest email
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
            The link we sent to {invitation.email} no longer works.
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
