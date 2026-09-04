"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  clearAssessmentState,
  clearPartnerRanks,
  clearResults,
  savePendingInvite,
} from "@/lib/storage";
import { HERO_GRADIENT } from "@/lib/theme";

/**
 * The disclosure step.
 *
 * The invited partner never agreed to anything — the inviter typed their
 * address. So what will be shared is stated plainly *before* they spend
 * five minutes answering, and declining is offered as an equal option
 * rather than buried.
 */
export function InviteLanding({
  token,
  inviterName,
  inviterEmail,
  inviteeEmail,
}: {
  token: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
}) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);

  function start() {
    savePendingInvite({ token, inviterName });
    // A fresh start: nothing from a previous run on this device should bleed
    // into the assessment now being taken on someone else's behalf.
    clearAssessmentState();
    clearResults();
    clearPartnerRanks();
    router.push("/assessment");
  }

  async function decline() {
    setDeclining(true);
    try {
      await fetch(`/api/invitations/${token}/decline`, { method: "POST" });
    } catch {
      // Declining is a courtesy to the inviter, not a guarantee we owe the
      // person declining — if the call fails they've still opted out here.
    }
    setDeclined(true);
    setDeclining(false);
  }

  if (declined) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">
          No problem
        </h1>
        <p className="text-sm leading-relaxed text-stone-500">
          We won&apos;t email you about this again, and nothing has been
          shared with {inviterName}.
        </p>
      </main>
    );
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-5"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-col gap-1 text-center">
        <p className="text-[11px] font-medium uppercase tracking-widest text-rose-400">
          My Relationship Needs
        </p>
        <h1 className="font-serif text-2xl font-semibold leading-tight text-stone-800">
          {inviterName} invited you
        </h1>
        <p className="text-xs text-stone-500">{inviterEmail}</p>
      </div>

      <p className="text-center text-sm leading-relaxed text-stone-600">
        They worked out which relationship needs matter most to them, and
        asked to compare notes with you. It takes about five minutes — you
        just pick between two things at a time.
      </p>

      <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          Before you start
        </p>
        <ul className="flex flex-col gap-2 text-xs leading-relaxed text-stone-600">
          <li>
            <span className="font-medium text-stone-800">
              You won&apos;t see their answers first.
            </span>{" "}
            Their results stay hidden until you&apos;ve finished your own, so
            nothing sways how you answer.
          </li>
          <li>
            <span className="font-medium text-stone-800">
              {inviterName} will see your results.
            </span>{" "}
            When you finish, you&apos;ll each be able to see the other&apos;s
            strongest areas and where you differ.
          </li>
          <li>
            <span className="font-medium text-stone-800">
              Your link goes to {inviteeEmail}.
            </span>{" "}
            That&apos;s the address {inviterName} entered, and it&apos;s where
            your own private results will be sent.
          </li>
        </ul>
      </div>

      <button
        onClick={start}
        className="rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-md"
        style={{ background: HERO_GRADIENT }}
      >
        Start the assessment
      </button>

      <button
        onClick={decline}
        disabled={declining}
        className="text-xs font-medium text-stone-400 disabled:opacity-60"
      >
        {declining ? "One moment…" : "No thanks, don't ask me again"}
      </button>
    </main>
  );
}
