import { NEEDS } from "@/data/needs";
import { fitBradleyTerry, type ComparisonRecord } from "@/lib/bradleyTerry";
import { MIN_COMPARISONS } from "@/lib/confidence";
import type { Pair } from "@/lib/pairing";

export { MIN_COMPARISONS };

// Stage boundaries (rounds), configurable — simulation may suggest changes.
// Discovery: 1-16. Refinement: 17-30. Top-candidate identification: 31-MIN_COMPARISONS.
const DISCOVERY_ROUNDS = 16;
const REFINEMENT_ROUNDS = 14;

const RECENCY_WINDOW = 3;
const EXPOSURE_CAP_REFINEMENT = 6;
const TOP_N_POOL_FINAL = 15;
const BOUNDARY_RANK_MIN = 6;
const BOUNDARY_RANK_MAX = 17;
const BOUNDARY_BOOST = 1.5;
/** Optimism bonus (in SE units) applied when deciding final-stage pool eligibility. */
const POOL_UCB_C = 1.0;

// Confidence-refinement stage (41-60): tighter pool, stronger focus on the
// #3/#4 boundary specifically, since that's the only thing still undecided.
const TOP_N_POOL_CONFIDENCE = 10;
const CONFIDENCE_BOUNDARY_RANK_MIN = 1; // 0-indexed rank 1 (displayed #2)
const CONFIDENCE_BOUNDARY_RANK_MAX = 4; // 0-indexed rank 4 (displayed #5)
const CONFIDENCE_BOUNDARY_BOOST = 1.8;
const CONFIDENCE_TOP8_RANK_MAX = 7; // 0-indexed rank 7 (displayed #8)
const CONFIDENCE_TOP8_BOOST = 1.3;

const CATEGORY_OF: Record<string, string> = Object.fromEntries(
  NEEDS.map((n) => [n.id, n.category])
);

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

function buildUsedPairs(history: ComparisonRecord[]): Set<string> {
  return new Set(history.map((r) => pairKey(r.winnerId, r.loserId)));
}

function buildExposure(ids: string[], history: ComparisonRecord[]): Map<string, number> {
  const exposure = new Map(ids.map((id) => [id, 0]));
  for (const { winnerId, loserId } of history) {
    exposure.set(winnerId, (exposure.get(winnerId) ?? 0) + 1);
    exposure.set(loserId, (exposure.get(loserId) ?? 0) + 1);
  }
  return exposure;
}

function buildRecent(history: ComparisonRecord[], window: number): Set<string> {
  const recent = new Set<string>();
  for (const { winnerId, loserId } of history.slice(-window)) {
    recent.add(winnerId);
    recent.add(loserId);
  }
  return recent;
}

/** Last resort: reuse whichever pair was least recently shown (or any distinct pair if history is empty). */
function fallbackPair(ids: string[], history: ComparisonRecord[]): Pair {
  if (history.length === 0) {
    const [a, b] = shuffle(ids);
    return [a, b];
  }
  const lastUsedRound = new Map<string, number>();
  history.forEach(({ winnerId, loserId }, idx) => {
    lastUsedRound.set(pairKey(winnerId, loserId), idx);
  });
  let bestKey: string | null = null;
  let bestRound = Infinity;
  for (const [key, round] of lastUsedRound) {
    if (round < bestRound) {
      bestRound = round;
      bestKey = key;
    }
  }
  if (bestKey) {
    const [a, b] = bestKey.split("::");
    return [a, b];
  }
  const [a, b] = shuffle(ids);
  return [a, b];
}

/** Rounds 1-16: even exposure, preferring needs from different categories. */
function selectDiscoveryPair(ids: string[], history: ComparisonRecord[]): Pair {
  const used = buildUsedPairs(history);
  const exposure = buildExposure(ids, history);
  const recent = buildRecent(history, RECENCY_WINDOW);

  const tryFind = (opts: { allowRecent: boolean; requireCrossCategory: boolean }): Pair | null => {
    const ordered = shuffle(ids).sort((x, y) => exposure.get(x)! - exposure.get(y)!);
    for (const a of ordered) {
      if (!opts.allowRecent && recent.has(a)) continue;
      for (const b of ordered) {
        if (b === a) continue;
        if (!opts.allowRecent && recent.has(b)) continue;
        if (opts.requireCrossCategory && CATEGORY_OF[a] === CATEGORY_OF[b]) continue;
        if (used.has(pairKey(a, b))) continue;
        return [a, b];
      }
    }
    return null;
  };

  return (
    tryFind({ allowRecent: false, requireCrossCategory: true }) ??
    tryFind({ allowRecent: true, requireCrossCategory: true }) ??
    tryFind({ allowRecent: true, requireCrossCategory: false }) ??
    fallbackPair(ids, history)
  );
}

/** Rounds 17-30: compare needs whose current estimated strengths are closest. */
function selectRefinementPair(ids: string[], history: ComparisonRecord[]): Pair {
  const used = buildUsedPairs(history);
  const exposure = buildExposure(ids, history);
  const recent = buildRecent(history, RECENCY_WINDOW);
  const fit = fitBradleyTerry(ids, history);

  const tryFind = (opts: { allowRecent: boolean; respectCap: boolean }): Pair | null => {
    let best: Pair | null = null;
    let bestDiff = Infinity;
    for (let x = 0; x < ids.length; x++) {
      const a = ids[x];
      if (!opts.allowRecent && recent.has(a)) continue;
      if (opts.respectCap && exposure.get(a)! >= EXPOSURE_CAP_REFINEMENT) continue;
      for (let y = x + 1; y < ids.length; y++) {
        const b = ids[y];
        if (!opts.allowRecent && recent.has(b)) continue;
        if (opts.respectCap && exposure.get(b)! >= EXPOSURE_CAP_REFINEMENT) continue;
        if (used.has(pairKey(a, b))) continue;
        const diff = Math.abs(fit.strength[a] - fit.strength[b]);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = [a, b];
        }
      }
    }
    return best;
  };

  return (
    tryFind({ allowRecent: false, respectCap: true }) ??
    tryFind({ allowRecent: true, respectCap: true }) ??
    tryFind({ allowRecent: true, respectCap: false }) ??
    fallbackPair(ids, history)
  );
}

/** Rounds 31-40: concentrate on the current top pool, especially the ambiguous boundary. */
function selectFinalPair(ids: string[], history: ComparisonRecord[]): Pair {
  const used = buildUsedPairs(history);
  const recent = buildRecent(history, RECENCY_WINDOW);
  const fit = fitBradleyTerry(ids, history);
  const ranked = [...ids].sort((a, b) => fit.strength[b] - fit.strength[a]);
  const rankIndex = new Map(ranked.map((id, i) => [id, i]));

  // Pool eligibility uses an optimistic (strength + uncertainty) score rather
  // than the raw point estimate: with only ~2-3 comparisons per need, a
  // genuinely strong need can dip below the point-estimate cutoff from one
  // unlucky result, and a flat/noise need can drift above it from one lucky
  // one. Rewarding uncertainty here keeps under-tested contenders eligible
  // until more evidence actually rules them out.
  const poolRanked = [...ids].sort(
    (a, b) =>
      fit.strength[b] + POOL_UCB_C * fit.se[b] - (fit.strength[a] + POOL_UCB_C * fit.se[a])
  );
  const pool = poolRanked.slice(0, Math.min(TOP_N_POOL_FINAL, poolRanked.length));

  const scoreOf = (a: string, b: string): number => {
    let score = fit.se[a] + fit.se[b] - Math.abs(fit.strength[a] - fit.strength[b]);
    const aBoundary =
      rankIndex.get(a)! >= BOUNDARY_RANK_MIN && rankIndex.get(a)! <= BOUNDARY_RANK_MAX;
    const bBoundary =
      rankIndex.get(b)! >= BOUNDARY_RANK_MIN && rankIndex.get(b)! <= BOUNDARY_RANK_MAX;
    if (aBoundary && bBoundary) score *= BOUNDARY_BOOST;
    return score;
  };

  const tryFind = (opts: { allowRecent: boolean; usePool: boolean }): Pair | null => {
    const candidates = opts.usePool ? pool : ranked;
    let best: Pair | null = null;
    let bestScore = -Infinity;
    for (let x = 0; x < candidates.length; x++) {
      const a = candidates[x];
      if (!opts.allowRecent && recent.has(a)) continue;
      for (let y = x + 1; y < candidates.length; y++) {
        const b = candidates[y];
        if (!opts.allowRecent && recent.has(b)) continue;
        if (used.has(pairKey(a, b))) continue;
        const score = scoreOf(a, b);
        if (score > bestScore) {
          bestScore = score;
          best = [a, b];
        }
      }
    }
    return best;
  };

  return (
    tryFind({ allowRecent: false, usePool: true }) ??
    tryFind({ allowRecent: true, usePool: true }) ??
    tryFind({ allowRecent: true, usePool: false }) ??
    fallbackPair(ids, history)
  );
}

/**
 * Rounds 41-60 (only reached if the assessment didn't already stop at 40):
 * the ranking question is settled for everything except the Top 3 boundary.
 * Pool shrinks to the current Top 10, and scoring leans hard into the #3/#4
 * region specifically — this is a distinct objective from the 31-40 stage
 * (which still cares about the whole #8-15 boundary), so it gets its own
 * strategy rather than reusing/overloading selectFinalPair.
 */
function selectConfidenceRefinementPair(ids: string[], history: ComparisonRecord[]): Pair {
  const used = buildUsedPairs(history);
  const recent = buildRecent(history, RECENCY_WINDOW);
  const fit = fitBradleyTerry(ids, history);
  const ranked = [...ids].sort((a, b) => fit.strength[b] - fit.strength[a]);
  const rankIndex = new Map(ranked.map((id, i) => [id, i]));

  // Same UCB-style optimism as the 31-40 stage's pool: a genuinely strong
  // need that took one early unlucky loss (high SE, dented point estimate)
  // must not get permanently excluded from these last, most-consequential
  // rounds before it's had a fair chance to be retested.
  const poolRanked = [...ids].sort(
    (a, b) =>
      fit.strength[b] + POOL_UCB_C * fit.se[b] - (fit.strength[a] + POOL_UCB_C * fit.se[a])
  );
  const pool = poolRanked.slice(0, Math.min(TOP_N_POOL_CONFIDENCE, poolRanked.length));

  const scoreOf = (a: string, b: string): number => {
    let score = fit.se[a] + fit.se[b] - Math.abs(fit.strength[a] - fit.strength[b]);
    const aRank = rankIndex.get(a)!;
    const bRank = rankIndex.get(b)!;
    const bothNearBoundary =
      aRank >= CONFIDENCE_BOUNDARY_RANK_MIN &&
      aRank <= CONFIDENCE_BOUNDARY_RANK_MAX &&
      bRank >= CONFIDENCE_BOUNDARY_RANK_MIN &&
      bRank <= CONFIDENCE_BOUNDARY_RANK_MAX;
    const bothTop8 = aRank <= CONFIDENCE_TOP8_RANK_MAX && bRank <= CONFIDENCE_TOP8_RANK_MAX;
    if (bothNearBoundary) score *= CONFIDENCE_BOUNDARY_BOOST;
    else if (bothTop8) score *= CONFIDENCE_TOP8_BOOST;
    return score;
  };

  const tryFind = (opts: { allowRecent: boolean; usePool: boolean }): Pair | null => {
    const candidates = opts.usePool ? pool : ranked;
    let best: Pair | null = null;
    let bestScore = -Infinity;
    for (let x = 0; x < candidates.length; x++) {
      const a = candidates[x];
      if (!opts.allowRecent && recent.has(a)) continue;
      for (let y = x + 1; y < candidates.length; y++) {
        const b = candidates[y];
        if (!opts.allowRecent && recent.has(b)) continue;
        if (used.has(pairKey(a, b))) continue;
        const score = scoreOf(a, b);
        if (score > bestScore) {
          bestScore = score;
          best = [a, b];
        }
      }
    }
    return best;
  };

  return (
    tryFind({ allowRecent: false, usePool: true }) ??
    tryFind({ allowRecent: true, usePool: true }) ??
    tryFind({ allowRecent: true, usePool: false }) ??
    fallbackPair(ids, history)
  );
}

/**
 * Picks the next comparison pair given everything answered so far. Never
 * repeats an exact pair, avoids re-showing a need within the last few
 * rounds, and moves through four stages: broad discovery, closest-strength
 * refinement, top-candidate identification, and — only if the assessment
 * runs past the 40-comparison minimum — confidence refinement focused on
 * the Top-3 boundary specifically.
 */
export function selectNextPair(ids: string[], history: ComparisonRecord[]): Pair {
  const round = history.length + 1;
  if (round <= DISCOVERY_ROUNDS) return selectDiscoveryPair(ids, history);
  if (round <= DISCOVERY_ROUNDS + REFINEMENT_ROUNDS) return selectRefinementPair(ids, history);
  if (round <= MIN_COMPARISONS) return selectFinalPair(ids, history);
  return selectConfidenceRefinementPair(ids, history);
}
