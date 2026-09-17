"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_EMOJI, NEEDS, type RelationshipNeed } from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import {
  classifyOverlap,
  describeRankGap,
  overlapBodyCopy,
  overlapHeadline,
  pickHighestSharedPriority,
  pluralizeCount,
  possessive,
  type SharedNeed,
} from "@/lib/comparisonInsights";
import { buildRanking } from "@/lib/ranking";
import { CATEGORY_ACCENT, CATEGORY_GRADIENT, HERO_GRADIENT } from "@/lib/theme";

const needsById = new Map<string, RelationshipNeed>(NEEDS.map((n) => [n.id, n]));

/** How many of each partner's unique needs show before "See all our needs". */
const INITIAL_UNIQUE_SHOWN = 3;

interface Side {
  name: string;
  history: ComparisonRecord[];
  selectedIds: string[];
}

function UniqueNeedsList({ needs }: { needs: RelationshipNeed[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {needs.map((need) => (
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
  );
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
  const [uniqueExpanded, setUniqueExpanded] = useState(false);
  const [ctaClicked, setCtaClicked] = useState(false);

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
      // Most-agreed first: the things you both put near the top. This is
      // display order, not the "highest shared priority" pick below, which
      // has its own explicit tie-break rules.
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

  const sharedCount = shared.length;
  const tier = classifyOverlap(sharedCount);
  const highestShared = useMemo(() => pickHighestSharedPriority(shared), [shared]);

  const hasMoreUnique = onlyYours.length > INITIAL_UNIQUE_SHOWN || onlyTheirs.length > INITIAL_UNIQUE_SHOWN;
  const visibleYours = uniqueExpanded ? onlyYours : onlyYours.slice(0, INITIAL_UNIQUE_SHOWN);
  const visibleTheirs = uniqueExpanded ? onlyTheirs : onlyTheirs.slice(0, INITIAL_UNIQUE_SHOWN);

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-3 px-4 pt-3"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-none items-center justify-between">
        <Link
          href={`/r/${token}`}
          aria-label="Back to my results"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
        >
          ‹
        </Link>
        <h1 className="font-serif text-lg font-semibold text-stone-800">
          You and {them.name}
        </h1>
        <span className="w-8" />
      </div>

      {/* 1. Relationship pattern */}
      <section className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-serif text-lg font-semibold leading-snug text-stone-800">
          {overlapHeadline(tier)}
        </h2>
        <p className="text-xs leading-relaxed text-stone-600">
          {overlapBodyCopy(sharedCount, tier, them.name)}
        </p>
        <p className="rounded-xl bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-500">
          This is not a compatibility score. It is a map for your next
          conversation.
        </p>
      </section>

      {/* 2. Shared needs */}
      <section className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            What already matters to both of you
          </h2>
          {sharedCount > 0 && (
            <span className="flex-none text-[11px] font-medium text-stone-400">
              {pluralizeCount(sharedCount, "shared need")}
            </span>
          )}
        </div>

        {sharedCount === 0 ? (
          <p className="text-xs leading-relaxed text-stone-500">
            None of your selected top 10 needs are the same. This is not a
            sign that the relationship cannot work. It means understanding
            each other&apos;s priorities will be especially valuable.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shared.map(({ need, yourRank, theirRank }) => (
              <li key={need.id} className="flex flex-col gap-1 rounded-xl bg-stone-50 px-2.5 py-2">
                <div className="flex items-center gap-2">
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
                </div>
                <p className="pl-3.5 text-[11px] leading-snug text-stone-500">
                  {describeRankGap(yourRank, theirRank, them.name)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {sharedCount > 0 && (
          <p className="text-[11px] leading-relaxed text-stone-400">
            Choosing the same need does not always mean experiencing it in
            the same way. The next step will help you explain what these
            needs mean to each of you.
          </p>
        )}
      </section>

      {highestShared && (
        <section
          className="flex flex-none flex-col gap-1 rounded-2xl px-4 py-4 text-white shadow-md"
          style={{ background: CATEGORY_GRADIENT[highestShared.need.category] }}
        >
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">
            Your highest shared priority
          </span>
          <span className="font-serif text-xl font-semibold leading-tight">
            {CATEGORY_EMOJI[highestShared.need.category]} {highestShared.need.name}
          </span>
          <span className="text-[12px] leading-snug text-white/85">
            {highestShared.need.description}
          </span>
        </section>
      )}

      {/* 3. Strongest individual priorities */}
      <section className="flex flex-none flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          What each of you most wants understood
        </h2>
        <p className="text-[11px] leading-relaxed text-stone-500">
          These needs are not in competition. Your partner does not need to
          share a need for it to be important. Understanding it is the first
          step toward deciding whether—and how—they can support it.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
              Your priorities
            </p>
            {visibleYours.length > 0 ? (
              <UniqueNeedsList needs={visibleYours} />
            ) : (
              <p className="text-[11px] leading-snug text-stone-400">
                Everything you chose is also something {them.name} chose.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">
              {possessive(them.name)} priorities
            </p>
            {visibleTheirs.length > 0 ? (
              <UniqueNeedsList needs={visibleTheirs} />
            ) : (
              <p className="text-[11px] leading-snug text-stone-400">
                Everything {them.name} chose is also something you chose.
              </p>
            )}
          </div>
        </div>

        {hasMoreUnique && (
          <button
            type="button"
            onClick={() => setUniqueExpanded((v) => !v)}
            aria-expanded={uniqueExpanded}
            className="self-center rounded-full px-3 py-1.5 text-[11px] font-medium text-stone-500 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
          >
            {uniqueExpanded ? "Show fewer needs" : "See all our needs"}
          </button>
        )}
      </section>

      <p className="px-1 text-center text-sm font-medium leading-relaxed text-stone-700">
        Your results show what deserves attention. Now let&apos;s help you
        talk about it.
      </p>

      {/* 4. Next step */}
      <section
        className="flex flex-none flex-col gap-3 rounded-3xl px-4 py-5 text-white shadow-md"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="flex flex-col gap-1 text-center">
          <h2 className="font-serif text-xl font-semibold leading-tight">
            Turn your results into a conversation
          </h2>
          <p className="text-xs leading-relaxed text-white/90">
            Choose the needs you most want your partner to understand.
            Together, you will explore:
          </p>
        </div>

        <ol className="flex flex-col gap-1.5 text-xs leading-snug text-white/90">
          <li>1. What the need means to you.</li>
          <li>2. How fulfilled it feels today.</li>
          <li>3. One concrete action that could help.</li>
          <li>4. Whether your partner can offer it—or suggest another way.</li>
        </ol>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCtaClicked(true)}
            aria-describedby={ctaClicked ? "guided-conversation-note" : undefined}
            className="rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Start our guided conversation
          </button>
          {ctaClicked && (
            <p id="guided-conversation-note" className="text-center text-[11px] text-white/80">
              We&apos;re building this next — for now, use what you&apos;ve
              found above as a guide for your own conversation.
            </p>
          )}
          <Link
            href={`/r/${token}`}
            className="text-center text-[11px] font-medium text-white/80 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Save and come back later
          </Link>
        </div>
      </section>
    </main>
  );
}
