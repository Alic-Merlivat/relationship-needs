"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_EMOJI,
  CATEGORY_QUESTION,
  NEEDS,
  type NeedCategory,
  type RelationshipNeed,
} from "@/data/needs";
import { SELECTION_SIZE, sameSelection } from "@/lib/selection";
import {
  clearAssessmentState,
  loadAssessmentState,
  loadSelection,
  saveSelection,
} from "@/lib/storage";
import { CATEGORY_ACCENT, CATEGORY_GRADIENT, HERO_GRADIENT } from "@/lib/theme";

const needsById = new Map<string, RelationshipNeed>(NEEDS.map((n) => [n.id, n]));

/** Needs grouped into their categories, preserving the data file's order. */
const GROUPED: { category: NeedCategory; needs: RelationshipNeed[] }[] = (() => {
  const byCategory = new Map<NeedCategory, RelationshipNeed[]>();
  for (const need of NEEDS) {
    const bucket = byCategory.get(need.category);
    if (bucket) bucket.push(need);
    else byCategory.set(need.category, [need]);
  }
  return [...byCategory.entries()].map(([category, needs]) => ({ category, needs }));
})();

export default function SelectPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [hasSeenAll, setHasSeenAll] = useState(false);
  const endSentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing = loadSelection();
    if (existing) {
      setSelected(existing);
      // Returning to a complete selection means the whole list was already
      // seen once; re-gating it would be busywork.
      setHasSeenAll(true);
    }
  }, []);

  useEffect(() => {
    const node = endSentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setHasSeenAll(true);
      },
      { rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const isFull = selected.length >= SELECTION_SIZE;
  const canContinue = selected.length === SELECTION_SIZE && hasSeenAll;

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= SELECTION_SIZE) return current;
      return [...current, id];
    });
  }

  function handleContinue() {
    if (!canContinue) return;
    // Changing the selection invalidates a part-finished ranking: those
    // comparisons were between different needs and can't be carried over.
    const inProgress = loadAssessmentState();
    if (inProgress && !sameSelection(inProgress.selectedIds, selected)) {
      clearAssessmentState();
    }
    saveSelection(selected);
    router.push("/assessment");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col px-4 pt-3">
      <div className="flex flex-none items-center justify-between">
        <button
          onClick={() => router.push("/")}
          aria-label="Back to home"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm"
        >
          ‹
        </button>
        <span className="text-xs font-medium text-stone-400">
          {selected.length} / {SELECTION_SIZE} selected
          {selected.length === SELECTION_SIZE && " ✓"}
        </span>
      </div>

      <h1 className="mt-3 text-center font-serif text-xl font-semibold leading-tight text-stone-800">
        What matters most to you in a relationship?
      </h1>
      <p className="mt-2 text-center text-xs leading-relaxed text-stone-500">
        Choose the {SELECTION_SIZE} needs that feel most important to you.
        Don&apos;t worry about ranking them yet — we&apos;ll do that next.
      </p>

      <div className="mt-4 flex flex-col gap-5 pb-4">
        {GROUPED.map(({ category, needs }) => (
          <section key={category} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-serif text-base font-semibold text-stone-800">
                {CATEGORY_EMOJI[category]} {category}
              </h2>
              <p className="text-[11px] italic leading-snug text-stone-400">
                {CATEGORY_QUESTION[category]}
              </p>
            </div>

            <ul className="flex flex-col gap-1.5">
              {needs.map((need) => {
                const isSelected = selectedSet.has(need.id);
                const isBlocked = isFull && !isSelected;
                return (
                  <li key={need.id}>
                    <button
                      type="button"
                      onClick={() => toggle(need.id)}
                      disabled={isBlocked}
                      aria-pressed={isSelected}
                      className={`flex w-full items-start gap-2.5 rounded-2xl px-3 py-2.5 text-left shadow-sm transition-all active:scale-[0.99] ${
                        isSelected ? "text-white" : "bg-white"
                      } ${isBlocked ? "opacity-40" : ""}`}
                      style={
                        isSelected
                          ? { background: CATEGORY_GRADIENT[need.category] }
                          : undefined
                      }
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold ${
                          isSelected ? "bg-white/25 text-white" : "border border-stone-300"
                        }`}
                        style={
                          isSelected ? undefined : { borderColor: CATEGORY_ACCENT[need.category] }
                        }
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={`text-sm font-semibold leading-tight ${
                            isSelected ? "text-white" : "text-stone-800"
                          }`}
                        >
                          {need.name}
                        </span>
                        <span
                          className={`text-[11px] leading-snug ${
                            isSelected ? "text-white/85" : "text-stone-500"
                          }`}
                        >
                          {need.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <div ref={endSentinel} aria-hidden className="h-px w-full" />

        <p className="pb-2 text-center text-[11px] leading-relaxed text-stone-400">
          That&apos;s all of them. The ones you didn&apos;t choose aren&apos;t
          unimportant — they just aren&apos;t your top {SELECTION_SIZE}.
        </p>
      </div>

      {/* Sticky summary: stays reachable through a long list, and is where
          Continue lives so the two are never out of sync. */}
      <div
        className="sticky bottom-0 -mx-4 flex flex-none flex-col gap-2 border-t border-stone-200 bg-[#FBF6F0]/95 px-4 pt-2.5 backdrop-blur"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            Your needs
          </span>
          <span
            className={`text-xs font-semibold ${
              selected.length === SELECTION_SIZE ? "text-emerald-600" : "text-stone-500"
            }`}
          >
            {selected.length} / {SELECTION_SIZE}
            {selected.length === SELECTION_SIZE && " ✓"}
          </span>
        </div>

        {selected.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {selected.map((id) => {
              const need = needsById.get(id)!;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${need.name}`}
                  className="flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                  style={{ background: CATEGORY_ACCENT[need.category] }}
                >
                  {need.name}
                  <span className="text-white/70">×</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: HERO_GRADIENT }}
        >
          Continue →
        </button>

        {!canContinue && (
          <p className="pb-0.5 text-center text-[11px] text-stone-400">
            {selected.length !== SELECTION_SIZE
              ? `Choose ${SELECTION_SIZE - selected.length} more`
              : "Scroll through the rest before continuing"}
          </p>
        )}
      </div>
    </main>
  );
}
