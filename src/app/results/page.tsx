"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_EMOJI, NEEDS, type RelationshipNeed } from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { buildRanking, copyFor, extendForTies, type RankedNeedView } from "@/lib/ranking";
import {
  clearAssessmentState,
  clearPartnerRanks,
  clearResults,
  encodeShareableRanks,
  loadPartnerRanks,
  loadResults,
} from "@/lib/storage";
import { CATEGORY_ACCENT, CATEGORY_GRADIENT, HERO_GRADIENT } from "@/lib/theme";

interface DiffNeed extends RelationshipNeed {
  yourRank: number;
  partnerRank: number;
  gap: number;
}

function buildBands(list: RankedNeedView[]): RankedNeedView[][] {
  const bands: RankedNeedView[][] = [];
  let current: RankedNeedView[] = [];
  list.forEach((item) => {
    current.push(item);
    if (!item.tiedWithNext) {
      bands.push(current);
      current = [];
    }
  });
  if (current.length) bands.push(current);
  return bands;
}

function rankLabel(band: RankedNeedView[]): string {
  return band.length > 1 ? `#${band[0].rank}–${band[band.length - 1].rank}` : `#${band[0].rank}`;
}

export default function ResultsPage() {
  const router = useRouter();
  const [topTen, setTopTen] = useState<RankedNeedView[] | null>(null);
  const [selected, setSelected] = useState<RankedNeedView | null>(null);
  const [history, setHistory] = useState<ComparisonRecord[] | null>(null);
  const [diffs, setDiffs] = useState<DiffNeed[] | null>(null);
  const [email, setEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const storedHistory = loadResults();
    if (!storedHistory) {
      router.replace("/");
      return;
    }
    setHistory(storedHistory);

    const ranking = buildRanking(storedHistory);
    setTopTen(extendForTies(ranking, 10));

    const partnerRanks = loadPartnerRanks();
    if (partnerRanks) {
      const yourRankById = new Map(ranking.map((r) => [r.id, r.rank]));
      const diffList = NEEDS.map((need) => {
        const yourRank = yourRankById.get(need.id)!;
        const partnerRank = partnerRanks[need.id] ?? yourRank;
        return { ...need, yourRank, partnerRank, gap: Math.abs(yourRank - partnerRank) };
      })
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 5);
      setDiffs(diffList);
    }
  }, [router]);

  function handleRetake() {
    clearResults();
    clearAssessmentState();
    clearPartnerRanks();
    router.push("/assessment");
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!email || !history) return;

    setInviteStatus("sending");
    setInviteError(null);

    const shareUrl = `${window.location.origin}/compare?from=${encodeShareableRanks(history)}`;

    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, shareUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        setInviteStatus("error");
        setInviteError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setInviteStatus("sent");
    } catch {
      setInviteStatus("error");
      setInviteError("Something went wrong. Please try again.");
    }
  }

  if (!topTen) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-stone-400">Loading your results...</p>
      </main>
    );
  }

  const [heroBand, ...restBands] = buildBands(topTen);

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-2 px-4 pt-3"
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
          Top Needs
        </h1>
        <button
          onClick={handleRetake}
          className="text-xs font-medium text-rose-400"
        >
          Retake
        </button>
      </div>

      <div
        className="flex flex-none flex-col gap-3 rounded-3xl px-4 py-4 text-white shadow-md"
        style={{ background: HERO_GRADIENT }}
      >
        <p className="text-center text-[11px] font-medium uppercase tracking-widest text-white/70">
          {heroBand.length > 1 ? "Tied for #1 – too close to call" : "#1"}
        </p>
        {heroBand.map((need) => (
          <button
            key={need.id}
            onClick={() => setSelected(need)}
            className="flex flex-col items-center gap-1 text-center transition-transform active:scale-[0.98]"
          >
            <span className="font-serif text-lg font-semibold leading-tight">
              {need.name}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {CATEGORY_EMOJI[need.category]} {need.category}
            </span>
            <span className="text-[11px] leading-snug text-white/85">
              {copyFor(need.rank, need.evidenceTier)}
            </span>
            <span className="text-[10px] text-white/70">
              Won {need.wins} of {need.appearances} head-to-head
            </span>
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-1.5">
        {restBands.map((band) => (
          <li
            key={band[0].id}
            className="rounded-xl bg-white px-2.5 py-1.5 shadow-sm"
          >
            <div className="flex items-center gap-2 pb-0.5">
              <span className="flex-none rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-medium text-white">
                {rankLabel(band)}
              </span>
              {band.length > 1 && (
                <span className="text-[10px] text-stone-400">
                  Statistically too close to call
                </span>
              )}
            </div>
            {band.map((need) => (
              <button
                key={need.id}
                onClick={() => setSelected(need)}
                className="flex w-full items-center gap-2 py-1 text-left"
              >
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: CATEGORY_ACCENT[need.category] }}
                />
                <span className="flex-1 truncate text-xs font-medium text-stone-800">
                  {need.name}
                </span>
                <span className="flex-none text-[11px] font-semibold text-stone-400">
                  {need.wins}-{need.losses}
                </span>
              </button>
            ))}
          </li>
        ))}
      </ol>

      {diffs && (
        <div className="mt-1 flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            You vs your partner
          </p>
          <p className="text-xs leading-relaxed text-stone-500">
            The needs where your rankings differ most.
          </p>
          <ol className="flex flex-col gap-1.5">
            {diffs.map((need) => (
              <li
                key={need.id}
                className="flex items-center gap-2 rounded-xl bg-stone-50 px-2.5 py-1.5"
              >
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: CATEGORY_ACCENT[need.category] }}
                />
                <span className="flex-1 truncate text-xs font-medium text-stone-800">
                  {need.name}
                </span>
                <span className="flex-none text-[11px] font-semibold text-rose-400">
                  You #{need.yourRank}
                </span>
                <span className="flex-none text-[11px] font-semibold text-sky-500">
                  Them #{need.partnerRank}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!diffs && (
        <form
          onSubmit={handleInvite}
          className="mt-1 flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm"
        >
          <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            Compare with your partner
          </p>
          <p className="text-xs leading-relaxed text-stone-500">
            Send them a link to take the same assessment and see where you
            differ.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (inviteStatus !== "idle") setInviteStatus("idle");
              }}
              placeholder="partner@email.com"
              className="min-w-0 flex-1 rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
            />
            <button
              type="submit"
              disabled={inviteStatus === "sending"}
              className="flex-none rounded-full px-4 py-2 text-xs font-medium text-white shadow-sm disabled:opacity-60"
              style={{ background: HERO_GRADIENT }}
            >
              {inviteStatus === "sending" ? "Sending…" : "Invite"}
            </button>
          </div>
          {inviteStatus === "sent" && (
            <p className="text-xs font-medium text-emerald-600">
              Invite sent to {email}.
            </p>
          )}
          {inviteStatus === "error" && (
            <p className="text-xs font-medium text-rose-500">{inviteError}</p>
          )}
        </form>
      )}

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-6 text-white shadow-xl"
            style={{ background: CATEGORY_GRADIENT[selected.category] }}
          >
            <div className="flex items-start justify-between">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {CATEGORY_EMOJI[selected.category]} {selected.category}
              </span>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/20 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 font-serif text-2xl font-semibold leading-tight">
              {selected.name}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-white/70">
              Rank #{selected.rank} · Won {selected.wins} of {selected.appearances}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              {copyFor(selected.rank, selected.evidenceTier)}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/90">
              {selected.description}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Includes: {selected.subNeeds.join(", ")}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
