"use client";

import { useEffect, useState, type FormEvent } from "react";
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

type SaveStatus = "idle" | "confirming" | "saving" | "error";

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<StoredResults | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
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

  async function save() {
    if (!results) return;
    setStatus("saving");
    setError(null);

    const endpoint = pendingInvite
      ? `/api/invitations/${pendingInvite.token}/complete`
      : "/api/assessments";

    const payload = pendingInvite
      ? { name, history: results.history, selectedNeeds: results.selectedIds }
      : {
          name,
          email,
          history: results.history,
          selectedNeeds: results.selectedIds,
          partnerEmail: partnerEmail.trim() || undefined,
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
      router.push(`/r/${data.token}`);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // A mistyped partner address emails a stranger, and the invitation
    // names the sender — so the address gets read back before anything sends.
    if (!pendingInvite && partnerEmail.trim() && status !== "confirming") {
      setStatus("confirming");
      return;
    }
    void save();
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

      <form
        onSubmit={handleSubmit}
        className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm"
      >
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          {pendingInvite ? `Share with ${pendingInvite.inviterName}` : "Save your results"}
        </p>
        <p className="text-xs leading-relaxed text-stone-500">
          {pendingInvite
            ? `We'll email your own private link, and ${pendingInvite.inviterName} will be able to see your results — just as you'll see theirs.`
            : "We'll email you a private link so you can come back to these. Add your partner's email to invite them to compare."}
        </p>

        {status === "confirming" ? (
          <div className="flex flex-col gap-2">
            <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
              We&apos;ll email an invitation to{" "}
              <span className="font-semibold text-stone-800">{partnerEmail.trim()}</span>.
              It will say it&apos;s from {name} ({email}). Is that right?
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
                type="submit"
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
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your first name"
              className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
            />
            {!pendingInvite && (
              <>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
                />
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@email.com (optional)"
                  className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
                />
              </>
            )}
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-full px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ background: HERO_GRADIENT }}
            >
              {status === "saving"
                ? "Saving…"
                : pendingInvite
                  ? "Save and share"
                  : "Save my results"}
            </button>
          </>
        )}

        {status === "error" && error && (
          <p className="text-xs font-medium text-rose-500">{error}</p>
        )}
        <p className="text-[11px] leading-relaxed text-stone-400">
          Your private link works for 30 days. Nothing is shared with anyone
          you don&apos;t invite.
        </p>
      </form>
    </main>
  );
}
