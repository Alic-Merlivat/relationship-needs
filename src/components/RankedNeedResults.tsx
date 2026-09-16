"use client";

import { useMemo, useState } from "react";
import { CATEGORY_EMOJI, CATEGORY_SHORT_LABEL } from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { buildRanking, type RankedNeedView } from "@/lib/ranking";
import { CATEGORY_ACCENT, CATEGORY_GRADIENT } from "@/lib/theme";

const TOP_HIGHLIGHTED = 3;

/**
 * The ranking of the needs a person chose.
 *
 * Deliberately need-first rather than rolled up into the nine Core Needs:
 * a self-chosen set of ten covers only a handful of categories, often with
 * a single member, and a category "average" over one need isn't comparable
 * to one over three. Ranking what they actually picked is the only honest
 * reading of this data.
 */
export function RankedNeedResults({
  history,
  selectedIds,
}: {
  history: ComparisonRecord[];
  selectedIds: string[];
}) {
  const ranking = useMemo(
    () => buildRanking(history, selectedIds),
    [history, selectedIds]
  );
  const [selected, setSelected] = useState<RankedNeedView | null>(null);

  const [first, ...others] = ranking.slice(0, TOP_HIGHLIGHTED);
  const rest = ranking.slice(TOP_HIGHLIGHTED);

  return (
    <>
      <p className="text-center text-xs leading-relaxed text-stone-500">
        Out of the needs you chose, these are the ones you leaned toward most
        consistently.
      </p>

      <section
        className="flex flex-none flex-col gap-3 rounded-3xl px-4 py-5 text-white shadow-md"
        style={{ background: CATEGORY_GRADIENT[first.category] }}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">
            Your strongest need
          </span>
          <span className="font-serif text-2xl font-semibold leading-tight">
            {first.name}
          </span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            {CATEGORY_EMOJI[first.category]} {CATEGORY_SHORT_LABEL[first.category]}
          </span>
        </div>
        <p className="text-center text-[13px] leading-relaxed text-white/90">
          {first.description}
        </p>
        <button
          onClick={() => setSelected(first)}
          className="self-center rounded-full bg-white/20 px-4 py-1.5 text-[11px] font-medium transition-transform active:scale-[0.98]"
        >
          What this includes
        </button>
      </section>

      {others.map((need) => (
        <button
          key={need.id}
          onClick={() => setSelected(need)}
          className="flex flex-none items-start gap-2.5 rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
        >
          <span
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: CATEGORY_ACCENT[need.category] }}
          >
            {need.rank}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-serif text-base font-semibold text-stone-800">
              {need.name}
            </span>
            <span className="text-[11px] leading-snug text-stone-500">
              {need.description}
            </span>
          </span>
          <span className="flex-none text-[11px] text-stone-300">›</span>
        </button>
      ))}

      <section className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          Also important to you
        </p>
        <ul className="flex flex-col gap-1">
          {rest.map((need) => (
            <li key={need.id}>
              <button
                onClick={() => setSelected(need)}
                className="flex w-full items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-left"
              >
                <span className="w-4 flex-none text-[11px] font-semibold text-stone-400">
                  {need.rank}
                </span>
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: CATEGORY_ACCENT[need.category] }}
                />
                <span className="flex-1 truncate text-xs font-medium text-stone-800">
                  {need.name}
                </span>
                <span className="flex-none text-[11px] text-stone-300">›</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-stone-400">
          Everything here is something you picked as important. The needs you
          didn&apos;t choose aren&apos;t ranked at all — they simply
          weren&apos;t part of your top ten.
        </p>
      </section>

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
              #{selected.rank} · {selected.name}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              {selected.description}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Includes: {selected.subNeeds.join(", ")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
