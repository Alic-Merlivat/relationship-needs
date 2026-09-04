import { type NeedCategory } from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { buildRanking, type RankedNeedView } from "@/lib/ranking";

export interface CoreNeedResult {
  category: NeedCategory;
  /** 1 = the Core Need this person weights most heavily. */
  rank: number;
  /**
   * Mean fitted Bradley-Terry strength across the category's member needs.
   *
   * Deliberately a mean rather than a count of wins: needs are shown an
   * uneven number of times by the adaptive pairing, so raw win totals would
   * reward whichever needs happened to come up most. Averaging fitted
   * strength is invariant both to how often a need appeared and to how many
   * cards a category happens to contain.
   *
   * Internal ordering signal — not meant to be shown as a score.
   */
  score: number;
  /** Member needs, strongest first for this person. */
  needs: RankedNeedView[];
  /** How many member needs actually came up during the assessment. */
  testedCount: number;
}

/**
 * Rolls the individual need ranking up into the 9 Core Relationship Needs,
 * ordered by how strongly this person weights each area.
 */
export function buildCoreNeedRanking(history: ComparisonRecord[]): CoreNeedResult[] {
  const ranking = buildRanking(history);

  // `ranking` is already sorted strongest-first, so each bucket inherits that order.
  const byCategory = new Map<NeedCategory, RankedNeedView[]>();
  for (const need of ranking) {
    const members = byCategory.get(need.category);
    if (members) members.push(need);
    else byCategory.set(need.category, [need]);
  }

  return [...byCategory.entries()]
    .map(([category, needs]) => ({
      category,
      rank: 0,
      score: needs.reduce((sum, n) => sum + n.strength, 0) / needs.length,
      needs,
      testedCount: needs.filter((n) => n.appearances > 0).length,
    }))
    .sort((a, b) => b.score - a.score)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}
