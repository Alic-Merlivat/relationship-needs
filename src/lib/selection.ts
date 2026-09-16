import { NEEDS } from "@/data/needs";
import {
  DEFAULT_CONFIDENCE_CONFIG,
  type ConfidenceConfig,
} from "@/lib/confidence";

/** How many needs a person picks before ranking begins. */
export const SELECTION_SIZE = 10;

/**
 * Comparisons shown when ranking the selected needs.
 *
 * With 10 items there are only C(10,2) = 45 distinct pairs, so this is 80%
 * of a complete round-robin — every need is seen about 7 times. That is far
 * denser evidence per item than the old 46-need assessment could reach, and
 * it makes the length predictable ("36 questions") instead of adaptive.
 */
export const COMPARISON_COUNT = 36;

export const TOTAL_POSSIBLE_PAIRS = (SELECTION_SIZE * (SELECTION_SIZE - 1)) / 2;

/**
 * Confidence settings for the fixed-length selected-needs assessment.
 *
 * The checkpoints are not stopping points here — the assessment always runs
 * the full budget. They exist so the stability test has earlier fits to
 * compare against: at 36 it checks whether the Top 3 is the same set it was
 * at 30, which is what separates a settled result from one still moving.
 */
export const SELECTION_CONFIDENCE_CONFIG: ConfidenceConfig = {
  ...DEFAULT_CONFIDENCE_CONFIG,
  evaluationCheckpoints: [24, 30, COMPARISON_COUNT],
  standardMaxComparisons: COMPARISON_COUNT,
  maxComparisons: COMPARISON_COUNT,
};

const KNOWN_NEED_IDS = new Set(NEEDS.map((n) => n.id));

/**
 * Validates a selection from storage or from a client request.
 *
 * Requires exactly `SELECTION_SIZE` distinct, currently-existing need ids.
 * A selection referencing a retired need can't be ranked or rendered, so it
 * is rejected here rather than failing deeper in the ranking code.
 */
export function parseSelection(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length !== SELECTION_SIZE) return null;
  const seen = new Set<string>();
  for (const id of value) {
    if (typeof id !== "string") return null;
    if (!KNOWN_NEED_IDS.has(id)) return null;
    if (seen.has(id)) return null;
    seen.add(id);
  }
  return [...value] as string[];
}

/** True when two selections contain the same needs, regardless of pick order. */
export function sameSelection(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}
