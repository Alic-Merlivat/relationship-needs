import { NEEDS, type NeedCategory, type RelationshipNeed } from "@/data/needs";
import {
  fitBradleyTerry,
  zScoreBetween,
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

  const sorted = [...ids].sort((a, b) => fit.strength[b] - fit.strength[a]);

  const tiedWithNext: Record<string, boolean> = {};
  let anchorId = sorted[0];
  for (let index = 0; index < sorted.length; index++) {
    const id = sorted[index];
    const nextId = sorted[index + 1];
    if (nextId === undefined) {
      tiedWithNext[id] = false;
      break;
    }
    const staysInBand = zScoreBetween(fit, anchorId, nextId) < TIE_Z_THRESHOLD;
    tiedWithNext[id] = staysInBand;
    if (!staysInBand) anchorId = nextId;
  }

  return sorted.map((id, index) => ({
    ...needsById.get(id)!,
    rank: index + 1,
    strength: fit.strength[id],
    evidenceTier: fit.evidenceTier[id],
    wins: fit.wins[id],
    losses: fit.losses[id],
    appearances: fit.appearances[id],
    tiedWithNext: tiedWithNext[id],
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

type RankTier = "top3" | "top10" | "rest";

function rankTierOf(rank: number): RankTier {
  if (rank <= 3) return "top3";
  if (rank <= 10) return "top10";
  return "rest";
}

const COPY_MATRIX: Record<RankTier, Record<EvidenceTier, string>> = {
  top3: {
    strong: "One of your strongest relationship priorities.",
    emerging:
      "Likely one of your top priorities — a few more comparisons would confirm it.",
    insufficient:
      "Ranked highly so far, though we don't have enough head-to-head data to be fully confident.",
  },
  top10: {
    strong: "A clear priority for you.",
    emerging: "Likely an important priority for you.",
    insufficient:
      "Placed in your top 10, but with limited data — take this placement lightly.",
  },
  rest: {
    strong: "Not currently among your top priorities.",
    emerging: "Not currently among your top priorities.",
    insufficient: "Not enough data to place this one confidently.",
  },
};

export function copyFor(rank: number, tier: EvidenceTier): string {
  return COPY_MATRIX[rankTierOf(rank)][tier];
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
