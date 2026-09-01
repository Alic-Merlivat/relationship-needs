/**
 * Simulates synthetic users with a known, hidden true preference ranking and
 * measures how reliably each ranking configuration recovers their real top 5
 * and top 10 from a 40-comparison assessment. Compares:
 *   (a) current Elo + current balanced-random pairing (the pre-V2 baseline)
 *   (b) Bradley-Terry scoring + current pairing
 *   (c) Bradley-Terry scoring + new adaptive pairing
 *
 * Run with: npm run simulate
 */

import { NEEDS } from "../src/data/needs";
import { applyEloUpdate, INITIAL_RATING } from "../src/lib/elo";
import { generatePairs } from "../src/lib/pairing";
import { fitBradleyTerry, type ComparisonRecord } from "../src/lib/bradleyTerry";
import { selectNextPair, TOTAL_COMPARISONS } from "../src/lib/adaptivePairing";

const NEED_IDS = NEEDS.map((n) => n.id);
const N_TRIALS = 300;

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) so each trial is exactly reproducible run-to-run.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const originalRandom = Math.random;
function withSeed<T>(seed: number, fn: () => T): T {
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

// ---------------------------------------------------------------------------
// Synthetic ground-truth profiles
// ---------------------------------------------------------------------------

interface Profile {
  name: string;
  trueStrength: Record<string, number>;
}

function makeProfile(name: string, strengths: number[]): Profile {
  const trueStrength: Record<string, number> = {};
  NEED_IDS.forEach((id, i) => {
    trueStrength[id] = strengths[i];
  });
  return { name, trueStrength };
}

const profileRng = mulberry32(42);
const noise = (magnitude: number) => (profileRng() - 0.5) * 2 * magnitude;

const categoryOf: Record<string, string> = Object.fromEntries(
  NEEDS.map((n) => [n.id, n.category])
);

const PROFILES: Profile[] = [
  makeProfile(
    "Clear favorites",
    NEED_IDS.map((_, i) => {
      if (i < 5) return 3 - i * 0.5; // 3, 2.5, 2, 1.5, 1
      return noise(0.3);
    })
  ),
  makeProfile(
    "Gradual slope",
    NEED_IDS.map((_, i) => 2 - (4 * i) / (NEED_IDS.length - 1))
  ),
  makeProfile(
    "Category-clustered",
    NEED_IDS.map((id) => {
      const elevated =
        categoryOf[id] === "Emotional Safety & Trust" ||
        categoryOf[id] === "Affection & Connection";
      return elevated ? 1.5 + noise(0.3) : 0 + noise(0.3);
    })
  ),
  makeProfile(
    "Ambiguous top-10 boundary",
    NEED_IDS.map((_, i) => {
      if (i < 7) return 2 + noise(0.2);
      if (i < 13) return 0.5 + noise(0.15);
      return -1 + noise(0.3);
    })
  ),
  makeProfile(
    "Single standout",
    NEED_IDS.map((_, i) => (i === 0 ? 3 : noise(0.4)))
  ),
];

// ---------------------------------------------------------------------------
// Stochastic choice model: sample directly from the true Bradley-Terry model.
// ---------------------------------------------------------------------------

function simulateChoice(
  trueStrength: Record<string, number>,
  a: string,
  b: string
): ComparisonRecord {
  const pAWins = 1 / (1 + Math.exp(-(trueStrength[a] - trueStrength[b])));
  return Math.random() < pAWins
    ? { winnerId: a, loserId: b }
    : { winnerId: b, loserId: a };
}

// ---------------------------------------------------------------------------
// Configurations under test
// ---------------------------------------------------------------------------

function runConfigA(trueStrength: Record<string, number>): string[] {
  const ids = [...NEED_IDS];
  const pairs = generatePairs(ids, 40);
  const scores: Record<string, number> = Object.fromEntries(
    ids.map((id) => [id, INITIAL_RATING])
  );
  for (const [a, b] of pairs) {
    const { winnerId, loserId } = simulateChoice(trueStrength, a, b);
    const { winner, loser } = applyEloUpdate(scores[winnerId], scores[loserId]);
    scores[winnerId] = winner;
    scores[loserId] = loser;
  }
  return [...ids].sort((x, y) => scores[y] - scores[x]);
}

function runConfigB(trueStrength: Record<string, number>): string[] {
  const ids = [...NEED_IDS];
  const pairs = generatePairs(ids, 40);
  const history: ComparisonRecord[] = pairs.map(([a, b]) =>
    simulateChoice(trueStrength, a, b)
  );
  const fit = fitBradleyTerry(ids, history);
  return [...ids].sort((x, y) => fit.strength[y] - fit.strength[x]);
}

function runConfigC(trueStrength: Record<string, number>): string[] {
  const ids = [...NEED_IDS];
  const history: ComparisonRecord[] = [];
  for (let round = 0; round < TOTAL_COMPARISONS; round++) {
    const [a, b] = selectNextPair(ids, history);
    history.push(simulateChoice(trueStrength, a, b));
  }
  const fit = fitBradleyTerry(ids, history);
  return [...ids].sort((x, y) => fit.strength[y] - fit.strength[x]);
}

const CONFIGS: { name: string; run: (trueStrength: Record<string, number>) => string[] }[] = [
  { name: "(a) Elo + current pairing", run: runConfigA },
  { name: "(b) Bradley-Terry + current pairing", run: runConfigB },
  { name: "(c) Bradley-Terry + adaptive pairing", run: runConfigC },
];

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function kendallTau(trueOrder: string[], computedOrder: string[]): number {
  const trueRank = new Map(trueOrder.map((id, i) => [id, i]));
  const compRank = new Map(computedOrder.map((id, i) => [id, i]));
  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < trueOrder.length; i++) {
    for (let j = i + 1; j < trueOrder.length; j++) {
      const a = trueOrder[i];
      const b = trueOrder[j];
      const trueSign = Math.sign(trueRank.get(a)! - trueRank.get(b)!);
      const compSign = Math.sign(compRank.get(a)! - compRank.get(b)!);
      if (trueSign === compSign) concordant++;
      else discordant++;
    }
  }
  const total = concordant + discordant;
  return total === 0 ? 1 : (concordant - discordant) / total;
}

interface TrialMetrics {
  top5ExactMatch: number;
  top5Overlap: number;
  top10ExactMatch: number;
  top10Overlap: number;
  kendallTau: number;
  meanAbsRankErrorTop10: number;
}

function computeMetrics(trueOrder: string[], computedOrder: string[]): TrialMetrics {
  const trueTop5 = trueOrder.slice(0, 5);
  const trueTop10 = trueOrder.slice(0, 10);
  const compTop5 = new Set(computedOrder.slice(0, 5));
  const compTop10 = new Set(computedOrder.slice(0, 10));

  const top5Overlap = trueTop5.filter((id) => compTop5.has(id)).length;
  const top10Overlap = trueTop10.filter((id) => compTop10.has(id)).length;

  const trueRank = new Map(trueOrder.map((id, i) => [id, i + 1]));
  const compRank = new Map(computedOrder.map((id, i) => [id, i + 1]));
  const meanAbsRankErrorTop10 =
    trueTop10.reduce((sum, id) => sum + Math.abs(trueRank.get(id)! - compRank.get(id)!), 0) /
    trueTop10.length;

  return {
    top5ExactMatch: top5Overlap === 5 ? 1 : 0,
    top5Overlap,
    top10ExactMatch: top10Overlap === 10 ? 1 : 0,
    top10Overlap,
    kendallTau: kendallTau(trueOrder, computedOrder),
    meanAbsRankErrorTop10,
  };
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const aggregate: Record<string, TrialMetrics[]> = Object.fromEntries(
  CONFIGS.map((c) => [c.name, []])
);

for (let profileIndex = 0; profileIndex < PROFILES.length; profileIndex++) {
  const profile = PROFILES[profileIndex];
  const trueOrder = [...NEED_IDS].sort(
    (a, b) => profile.trueStrength[b] - profile.trueStrength[a]
  );

  console.log(`\n=== Profile: ${profile.name} ===`);
  const rows: Record<string, unknown>[] = [];

  for (const config of CONFIGS) {
    const trials: TrialMetrics[] = [];
    for (let trial = 0; trial < N_TRIALS; trial++) {
      const seed = profileIndex * 100000 + trial;
      const computedOrder = withSeed(seed, () => config.run(profile.trueStrength));
      trials.push(computeMetrics(trueOrder, computedOrder));
    }
    aggregate[config.name].push(...trials);

    rows.push({
      Configuration: config.name,
      "Top-5 exact match": `${(average(trials.map((t) => t.top5ExactMatch)) * 100).toFixed(1)}%`,
      "Top-5 avg overlap (/5)": average(trials.map((t) => t.top5Overlap)).toFixed(2),
      "Top-10 exact match": `${(average(trials.map((t) => t.top10ExactMatch)) * 100).toFixed(1)}%`,
      "Top-10 avg overlap (/10)": average(trials.map((t) => t.top10Overlap)).toFixed(2),
      "Kendall's tau": average(trials.map((t) => t.kendallTau)).toFixed(3),
      "Mean |rank error| (top 10)": average(trials.map((t) => t.meanAbsRankErrorTop10)).toFixed(2),
    });
  }

  console.table(rows);
}

console.log(`\n=== Aggregate across all ${PROFILES.length} profiles (${N_TRIALS} trials each) ===`);
const aggregateRows = CONFIGS.map((config) => {
  const trials = aggregate[config.name];
  return {
    Configuration: config.name,
    "Top-5 exact match": `${(average(trials.map((t) => t.top5ExactMatch)) * 100).toFixed(1)}%`,
    "Top-5 avg overlap (/5)": average(trials.map((t) => t.top5Overlap)).toFixed(2),
    "Top-10 exact match": `${(average(trials.map((t) => t.top10ExactMatch)) * 100).toFixed(1)}%`,
    "Top-10 avg overlap (/10)": average(trials.map((t) => t.top10Overlap)).toFixed(2),
    "Kendall's tau": average(trials.map((t) => t.kendallTau)).toFixed(3),
    "Mean |rank error| (top 10)": average(trials.map((t) => t.meanAbsRankErrorTop10)).toFixed(2),
  };
});
console.table(aggregateRows);
