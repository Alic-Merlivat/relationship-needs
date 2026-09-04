"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CATEGORY_EMOJI,
  CATEGORY_QUESTION,
  type NeedCategory,
} from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { buildCoreNeedRanking } from "@/lib/coreNeeds";
import { CATEGORY_ACCENT, CATEGORY_GRADIENT } from "@/lib/theme";

interface Side {
  name: string;
  history: ComparisonRecord[];
}

const TOP_SHOWN = 3;
const DIFFERENCES_SHOWN = 3;

export function ComparisonView({
  token,
  you,
  them,
}: {
  token: string;
  you: Side;
  them: Side;
}) {
  const { shared, yourTop, theirTop, differences } = useMemo(() => {
    const yourRanking = buildCoreNeedRanking(you.history);
    const theirRanking = buildCoreNeedRanking(them.history);

    const yourRank = new Map(yourRanking.map((c) => [c.category, c.rank]));
    const theirRank = new Map(theirRanking.map((c) => [c.category, c.rank]));

    const yourTopSet = yourRanking.slice(0, TOP_SHOWN).map((c) => c.category);
    const theirTopSet = theirRanking.slice(0, TOP_SHOWN).map((c) => c.category);

    return {
      yourTop: yourTopSet,
      theirTop: theirTopSet,
      shared: yourTopSet.filter((c) => theirTopSet.includes(c)),
      differences: [...yourRank.keys()]
        .map((category) => ({
          category,
          yours: yourRank.get(category)!,
          theirs: theirRank.get(category)!,
          gap: Math.abs(yourRank.get(category)! - theirRank.get(category)!),
        }))
        .sort((a, b) => b.gap - a.gap)
        .slice(0, DIFFERENCES_SHOWN),
    };
  }, [you.history, them.history]);

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-3 px-4 pt-3"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-none items-center justify-between">
        <Link
          href={`/r/${token}`}
          aria-label="Back to my results"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm"
        >
          ‹
        </Link>
        <h1 className="font-serif text-lg font-semibold text-stone-800">
          You and {them.name}
        </h1>
        <span className="w-8" />
      </div>

      <p className="text-center text-xs leading-relaxed text-stone-500">
        Two people can need different things and both be right. This is a
        starting point for a conversation, not a score.
      </p>

      {shared.length > 0 && (
        <section className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            You both lead with
          </p>
          <ul className="flex flex-col gap-1.5">
            {shared.map((category) => (
              <li
                key={category}
                className="flex flex-col gap-0.5 rounded-xl px-3 py-2 text-white"
                style={{ background: CATEGORY_GRADIENT[category as NeedCategory] }}
              >
                <span className="text-sm font-medium">
                  {CATEGORY_EMOJI[category as NeedCategory]} {category}
                </span>
                <span className="text-[11px] italic leading-snug text-white/85">
                  {CATEGORY_QUESTION[category as NeedCategory]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-none flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          Each of your strongest areas
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "You", list: yourTop },
            { label: them.name, list: theirTop },
          ].map((column) => (
            <div key={column.label} className="flex flex-col gap-1.5">
              <p className="truncate text-xs font-semibold text-stone-700">
                {column.label}
              </p>
              {column.list.map((category, index) => (
                <div
                  key={category}
                  className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-2 py-1.5"
                >
                  <span
                    className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[9px] font-semibold text-white"
                    style={{ background: CATEGORY_ACCENT[category as NeedCategory] }}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate text-[11px] font-medium text-stone-700">
                    {CATEGORY_EMOJI[category as NeedCategory]} {category}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          Worth talking about
        </p>
        <p className="text-xs leading-relaxed text-stone-500">
          These are the areas you place most differently. A gap isn&apos;t a
          problem — it&apos;s usually just something one of you needs named
          out loud.
        </p>
        <ul className="flex flex-col gap-1.5">
          {differences.map((row) => (
            <li
              key={row.category}
              className="flex items-center gap-2 rounded-xl bg-stone-50 px-2.5 py-2"
            >
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: CATEGORY_ACCENT[row.category] }}
              />
              <span className="flex-1 truncate text-xs font-medium text-stone-800">
                {CATEGORY_EMOJI[row.category]} {row.category}
              </span>
              <span className="flex-none text-[11px] font-semibold text-rose-400">
                You #{row.yours}
              </span>
              <span className="flex-none text-[11px] font-semibold text-sky-500">
                Them #{row.theirs}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
