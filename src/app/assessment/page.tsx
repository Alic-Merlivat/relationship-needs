"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NEEDS, type NeedCategory, type RelationshipNeed } from "@/data/needs";
import { NeedCard } from "@/components/NeedCard";
import { exploredCategories } from "@/lib/ranking";
import { CATEGORY_ACCENT, HERO_GRADIENT } from "@/lib/theme";
import {
  COMPARISON_COUNT,
  advanceAssessment,
  clearAssessmentState,
  createAssessmentState,
  loadAssessmentState,
  loadSelection,
  saveAssessmentState,
  saveResults,
  type AssessmentState,
} from "@/lib/storage";

const needsById = new Map<string, RelationshipNeed>(
  NEEDS.map((n) => [n.id, n])
);

export default function AssessmentPage() {
  const router = useRouter();
  const [state, setState] = useState<AssessmentState | null>(null);

  useEffect(() => {
    const selection = loadSelection();
    if (!selection) {
      router.replace("/select");
      return;
    }

    const existing = loadAssessmentState();
    if (existing && existing.currentPair) {
      setState(existing);
    } else {
      const fresh = createAssessmentState(selection);
      saveAssessmentState(fresh);
      setState(fresh);
    }
  }, [router]);

  if (!state || !state.currentPair) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-stone-400">Loading...</p>
      </main>
    );
  }

  const [needAId, needBId] = state.currentPair;
  const needA = needsById.get(needAId)!;
  const needB = needsById.get(needBId)!;

  function handleChoice(winnerId: string, loserId: string) {
    if (!state) return;
    const nextState = advanceAssessment(state, winnerId, loserId);

    if (!nextState.currentPair) {
      saveResults(nextState.history, nextState.selectedIds);
      clearAssessmentState();
      router.push("/results");
      return;
    }

    saveAssessmentState(nextState);
    setState(nextState);
  }

  const progress = state.history.length;
  const progressPct = Math.round((progress / COMPARISON_COUNT) * 100);
  const touched = exploredCategories(state.history);

  // Only the categories this person's own selection covers — showing all
  // nine would leave dots that can never fill, implying missed ground.
  const selectedCategories = [
    ...new Set(state.selectedIds.map((id) => needsById.get(id)!.category)),
  ] as NeedCategory[];

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 pb-6 pt-4">
      <div className="flex flex-none items-center gap-3">
        <button
          onClick={() => router.push("/select")}
          aria-label="Back to choosing your needs"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white text-stone-500 shadow-sm"
        >
          ‹
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, background: HERO_GRADIENT }}
          />
        </div>
        <span className="flex-none text-xs font-medium text-stone-400">
          {progress + 1}/{COMPARISON_COUNT}
        </span>
      </div>

      <h1 className="text-center font-serif text-xl font-semibold text-stone-800">
        Which matters more?
      </h1>

      <div className="grid grid-cols-2 gap-3">
        <NeedCard need={needA} onClick={() => handleChoice(needA.id, needB.id)} />
        <NeedCard need={needB} onClick={() => handleChoice(needB.id, needA.id)} />
      </div>

      {progress > 0 && (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
          <p className="text-xs leading-relaxed text-stone-500">
            Your relationship-needs profile is taking shape.
          </p>
          <div className="flex gap-2">
            {selectedCategories.map((category) => (
              <span
                key={category}
                title={category}
                className="h-2.5 w-2.5 rounded-full transition-opacity"
                style={{
                  background: CATEGORY_ACCENT[category],
                  opacity: touched.has(category) ? 1 : 0.25,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
