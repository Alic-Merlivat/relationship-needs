"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RankedNeedResults } from "@/components/RankedNeedResults";
import {
  clearAssessmentState,
  clearPendingInvite,
  clearResults,
  clearSelection,
  loadPendingInvite,
  loadResults,
  type PendingInvite,
  type StoredResults,
} from "@/lib/storage";
import { HERO_GRADIENT } from "@/lib/theme";
import { whatsAppInviteUrl } from "@/lib/whatsapp";

type Status = "idle" | "confirming" | "saving" | "error";
/** Which sharing option is on screen — only relevant when not `pendingInvite`. */
type ShareMode = "choose" | "email";

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<StoredResults | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("choose");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadResults();
    if (!stored) {
      router.replace("/");
      return;
    }
    setResults(stored);
    setPendingInvite(loadPendingInvite());
  }, [router]);

  function handleRetake() {
    clearResults();
    clearAssessmentState();
    clearSelection();
    router.push("/select");
  }

  /** Own name (and, where needed, own email) filled in before anything can be sent. */
  function validateOwnDetails(): boolean {
    if (!name.trim()) {
      setStatus("error");
      setError("Please enter your first name.");
      return false;
    }
    const needsOwnEmail = !pendingInvite || !pendingInvite.inviteeEmailKnown;
    if (needsOwnEmail && !email.trim()) {
      setStatus("error");
      setError("Please enter your email address.");
      return false;
    }
    setError(null);
    return true;
  }

  async function submit(extra: {
    partnerEmail?: string;
    wantsWhatsAppInvite?: boolean;
  }): Promise<void> {
    if (!results) return;
    setStatus("saving");
    setError(null);

    const endpoint = pendingInvite
      ? `/api/invitations/${pendingInvite.token}/complete`
      : "/api/assessments";

    const payload = pendingInvite
      ? {
          name,
          // Only sent when the invitation didn't already know an address —
          // omitting it otherwise keeps the server-side rule intact: an
          // addressed invitation's results always go to the address that
          // was actually invited, never wherever a form happens to say.
          email: pendingInvite.inviteeEmailKnown ? undefined : email,
          history: results.history,
          selectedNeeds: results.selectedIds,
        }
      : {
          name,
          email,
          history: results.history,
          selectedNeeds: results.selectedIds,
          ...extra,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      clearPendingInvite();
      clearResults();
      clearAssessmentState();
      clearSelection();

      // Best-effort: if this gets popup-blocked, the "Waiting on your
      // partner" card on the page we land on next has the same WhatsApp
      // button as a fallback, so nothing is lost.
      if (extra.wantsWhatsAppInvite && data.inviteUrl) {
        window.open(whatsAppInviteUrl(data.inviteUrl), "_blank", "noopener,noreferrer");
      }

      router.push(`/r/${data.token}`);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleWhatsAppShare() {
    if (!validateOwnDetails()) return;
    await submit({ wantsWhatsAppInvite: true });
  }

  function handleChooseEmailInvite() {
    if (!validateOwnDetails()) return;
    setShareMode("email");
  }

  async function handlePlainSave() {
    if (!validateOwnDetails()) return;
    await submit({});
  }

  function handleEmailInviteContinue() {
    if (!validateOwnDetails()) return;
    if (!partnerEmail.trim()) {
      setStatus("error");
      setError("Please enter your partner's email address.");
      return;
    }
    setStatus("confirming");
  }

  async function handlePendingInviteSave() {
    if (!validateOwnDetails()) return;
    await submit({});
  }

  if (!results) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-stone-400">Loading your results...</p>
      </main>
    );
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-3 px-4 pt-3"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-none items-center justify-between">
        <button
          onClick={() => router.push("/")}
          aria-label="Back to home"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm"
        >
          ‹
        </button>
        <h1 className="font-serif text-lg font-semibold text-stone-800">
          What matters most
        </h1>
        <button onClick={handleRetake} className="text-xs font-medium text-rose-400">
          Retake
        </button>
      </div>

      <RankedNeedResults history={results.history} selectedIds={results.selectedIds} />

      <div className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          {pendingInvite ? `Share with ${pendingInvite.inviterName}` : "Share your results"}
        </p>
        <p className="text-xs leading-relaxed text-stone-500">
          {pendingInvite
            ? `We'll email your own private link, and ${pendingInvite.inviterName} will be able to see your results — just as you'll see theirs.`
            : "Send your partner an invite to compare, or just save your own private link for now."}
        </p>

        <input
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
        />

        {(!pendingInvite || !pendingInvite.inviteeEmailKnown) && (
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
          />
        )}

        {pendingInvite ? (
          <button
            type="button"
            onClick={() => void handlePendingInviteSave()}
            disabled={status === "saving"}
            className="rounded-full px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
            style={{ background: HERO_GRADIENT }}
          >
            {status === "saving" ? "Saving…" : "Save and share"}
          </button>
        ) : shareMode === "choose" ? (
          <>
            <button
              type="button"
              onClick={() => void handleWhatsAppShare()}
              disabled={status === "saving"}
              className="flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Share via WhatsApp"}
            </button>
            <button
              type="button"
              onClick={handleChooseEmailInvite}
              className="text-center text-[11px] font-medium text-stone-500 underline underline-offset-2"
            >
              or invite by email instead
            </button>
            <button
              type="button"
              onClick={() => void handlePlainSave()}
              disabled={status === "saving"}
              className="text-center text-[11px] font-medium text-stone-400 disabled:opacity-60"
            >
              Just save my results, I&apos;ll share later
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {status === "confirming" ? (
              <div className="flex flex-col gap-2">
                <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
                  We&apos;ll email an invitation to{" "}
                  <span className="font-semibold text-stone-800">
                    {partnerEmail.trim()}
                  </span>
                  . It will say it&apos;s from {name} ({email}). Is that right?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="flex-1 rounded-full border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600"
                  >
                    Change it
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit({ partnerEmail })}
                    disabled={status !== "confirming"}
                    className="flex-1 rounded-full px-3 py-2 text-xs font-semibold text-white shadow-sm"
                    style={{ background: HERO_GRADIENT }}
                  >
                    Yes, send it
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="email"
                  required
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@email.com"
                  className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
                />
                <button
                  type="button"
                  onClick={handleEmailInviteContinue}
                  className="rounded-full px-4 py-2.5 text-xs font-semibold text-white shadow-sm"
                  style={{ background: HERO_GRADIENT }}
                >
                  Send invite
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setShareMode("choose");
                setStatus("idle");
              }}
              className="text-center text-[11px] font-medium text-stone-400"
            >
              ‹ Back
            </button>
          </div>
        )}

        {status === "error" && error && (
          <p className="text-xs font-medium text-rose-500">{error}</p>
        )}
        <p className="text-[11px] leading-relaxed text-stone-400">
          Your private link works for 30 days. Nothing is shared with anyone
          you don&apos;t invite.
        </p>
      </div>
    </main>
  );
}
