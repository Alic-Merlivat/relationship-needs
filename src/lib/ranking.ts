import { NEEDS, type NeedCategory, type RelationshipNeed } from "@/data/needs";
import {
  computeTieBands,
  fitBradleyTerry,
  TIE_Z_THRESHOLD,
  type ComparisonRecord,
  type EvidenceTier,
} from "@/lib/bradleyTerry";

export interface RankedNeedView extends RelationshipNeed {
  rank: number;
  strength: number;
  evidenceTier: EvidenceTier;
  wins: number;
  losses: number;
  appearances: number;
  tiedWithNext: boolean;
}

const needsById = new Map<string, RelationshipNeed>(NEEDS.map((n) => [n.id, n]));

/**
 * Fits the complete comparison history and returns every need sorted by
 * strength, most-preferred first, along with each need's evidence tier and
 * whether it's statistically tied with the very next need in the list.
 *
 * Tie bands are anchored to their top (highest-ranked) member rather than
 * chained link-by-link through adjacent pairs: A being statistically tied
 * with B, and B tied with C, does not imply A and C are tied. Comparing
 * every candidate back to the band's anchor prevents a long run of
 * individually-small gaps from silently drifting a clear #1 (say, a 9-0
 * record) into the same "too close to call" band as a need with zero
 * comparisons.
 */
export function buildRanking(history: ComparisonRecord[]): RankedNeedView[] {
  const ids = NEEDS.map((n) => n.id);
  const fit = fitBradleyTerry(ids, history);
  const bands = computeTieBands(ids, fit, TIE_Z_THRESHOLD);

  const bandIndexOf = new Map<string, number>();
  bands.forEach((band, bandIndex) => {
    band.forEach((id) => bandIndexOf.set(id, bandIndex));
  });

  const sorted = bands.flat();

  return sorted.map((id, index) => ({
    ...needsById.get(id)!,
    rank: index + 1,
    strength: fit.strength[id],
    evidenceTier: fit.evidenceTier[id],
    wins: fit.wins[id],
    losses: fit.losses[id],
    appearances: fit.appearances[id],
    tiedWithNext:
      index + 1 < sorted.length && bandIndexOf.get(id) === bandIndexOf.get(sorted[index + 1]),
  }));
}

/**
 * Returns the top `count` needs, extended to include any needs tied with
 * the last one so a tie band is never arbitrarily split across the cutoff.
 */
export function extendForTies(
  ranked: RankedNeedView[],
  count: number
): RankedNeedView[] {
  let end = Math.min(count, ranked.length);
  while (end < ranked.length && ranked[end - 1].tiedWithNext) {
    end++;
  }
  return ranked.slice(0, end);
}

/** Categories touched by at least one comparison so far, for a neutral mid-assessment progress cue. */
export function exploredCategories(history: ComparisonRecord[]): Set<NeedCategory> {
  const explored = new Set<NeedCategory>();
  for (const { winnerId, loserId } of history) {
    explored.add(needsById.get(winnerId)!.category);
    explored.add(needsById.get(loserId)!.category);
  }
  return explored;
}
