"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CATEGORY_EMOJI, NEEDS, type RelationshipNeed } from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { buildRanking } from "@/lib/ranking";
import { CATEGORY_ACCENT, CATEGORY_GRADIENT } from "@/lib/theme";

const needsById = new Map<string, RelationshipNeed>(NEEDS.map((n) => [n.id, n]));

interface Side {
  name: string;
  history: ComparisonRecord[];
  selectedIds: string[];
}

interface SharedNeed {
  need: RelationshipNeed;
  yourRank: number;
  theirRank: number;
}

export function ComparisonView({
  token,
  you,
  them,
}: {
  token: string;
  you: Side;
  them: Side;
}) {
  const { shared, onlyYours, onlyTheirs } = useMemo(() => {
    const yourRank = new Map(
      buildRanking(you.history, you.selectedIds).map((r) => [r.id, r.rank])
    );
    const theirRank = new Map(
      buildRanking(them.history, them.selectedIds).map((r) => [r.id, r.rank])
    );

    const theirSet = new Set(them.selectedIds);
    const yourSet = new Set(you.selectedIds);

    const sharedNeeds: SharedNeed[] = you.selectedIds
      .filter((id) => theirSet.has(id))
      .map((id) => ({
        need: needsById.get(id)!,
        yourRank: yourRank.get(id)!,
        theirRank: theirRank.get(id)!,
      }))
      // Most-agreed first: the things you both put near the top.
      .sort((a, b) => a.yourRank + a.theirRank - (b.yourRank + b.theirRank));

    return {
      shared: sharedNeeds,
      onlyYours: you.selectedIds
        .filter((id) => !theirSet.has(id))
        .map((id) => needsById.get(id)!)
        .sort((a, b) => yourRank.get(a.id)! - yourRank.get(b.id)!),
      onlyTheirs: them.selectedIds
        .filter((id) => !yourSet.has(id))
        .map((id) => needsById.get(id)!)
        .sort((a, b) => theirRank.get(a.id)! - theirRank.get(b.id)!),
    };
  }, [you, them]);

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
        You each chose ten needs independently. Two people can need different
        things and both be right — this is a starting point for a
        conversation, not a score.
      </p>

      <section className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          You both chose · {shared.length}
        </p>
        {shared.length === 0 ? (
          <p className="text-xs leading-relaxed text-stone-500">
            You didn&apos;t pick any of the same needs. That&apos;s worth
            talking about rather than worrying about — it usually means you
            each take different things for granted.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {shared.map(({ need, yourRank, theirRank }) => (
              <li
                key={need.id}
                className="flex items-center gap-2 rounded-xl bg-stone-50 px-2.5 py-2"
              >
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: CATEGORY_ACCENT[need.category] }}
                />
                <span className="flex-1 truncate text-xs font-medium text-stone-800">
                  {need.name}
                </span>
                <span className="flex-none text-[11px] font-semibold text-rose-400">
                  You #{yourRank}
                </span>
                <span className="flex-none text-[11px] font-semibold text-sky-500">
                  Them #{theirRank}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {shared.length > 0 && (
        <section
          className="flex flex-none flex-col gap-1 rounded-2xl px-4 py-4 text-white shadow-md"
          style={{ background: CATEGORY_GRADIENT[shared[0].need.category] }}
        >
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">
            Your strongest common ground
          </span>
          <span className="font-serif text-xl font-semibold leading-tight">
            {CATEGORY_EMOJI[shared[0].need.category]} {shared[0].need.name}
          </span>
          <span className="text-[12px] leading-snug text-white/85">
            {shared[0].need.description}
          </span>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Only you chose", list: onlyYours, tone: "text-rose-400" },
          { label: `Only ${them.name} chose`, list: onlyTheirs, tone: "text-sky-500" },
        ].map((column) => (
          <section
            key={column.label}
            className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm"
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${column.tone}`}>
              {column.label}
            </p>
            <ul className="flex flex-col gap-1">
              {column.list.map((need) => (
                <li
                  key={need.id}
                  className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-2 py-1.5"
                >
                  <span
                    className="h-1.5 w-1.5 flex-none rounded-full"
                    style={{ background: CATEGORY_ACCENT[need.category] }}
                  />
                  <span className="flex-1 truncate text-[11px] font-medium text-stone-700">
                    {need.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-stone-400">
        A need only one of you chose isn&apos;t one the other rejected — it
        just didn&apos;t make their ten. Those are often the most useful
        things to hear said out loud.
      </p>
    </main>
  );
}
