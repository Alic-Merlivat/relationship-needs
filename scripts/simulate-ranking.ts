/**
 * Simulates synthetic users with a known, hidden true preference ranking.
 *
 * Section 1 reproduces the original fixed-40-comparison comparison between
 * (a) Elo + old pairing, (b) Bradley-Terry + old pairing, and (c)
 * Bradley-Terry + adaptive pairing (no early stopping) — kept as a legacy
 * reference point.
 *
 * Section 2 is the actual deliverable for the V2.1 adaptive-length work: a
 * parameter sweep over the Top-3 stop condition (minimum exposure, the
 * #3-vs-#4 separation z-threshold), measuring assessment length, recovery
 * quality, and — most importantly — the false-confidence rate: how often
 * the algorithm confidently declares a Top 3 that's actually wrong.
 *
 * Run with: npm run simulate
 */

import { NEEDS } from "../src/data/needs";
import { applyEloUpdate, INITIAL_RATING } from "../src/lib/elo";
import { generatePairs } from "../src/lib/pairing";
import { computeTieBands, fitBradleyTerry, type ComparisonRecord } from "../src/lib/bradleyTerry";
import { selectNextPair, MIN_COMPARISONS } from "../src/lib/adaptivePairing";
import {
  evaluateAssessmentConfidence,
  STANDARD_MAX_COMPARISONS,
  EXTENDED_MAX_COMPARISONS,
  EVALUATION_CHECKPOINTS,
  EXTENDED_EVALUATION_CHECKPOINTS,
  type ConfidenceConfig,
} from "../src/lib/confidence";

const NEED_IDS = NEEDS.map((n) => n.id);

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
        categoryOf[id] === "Love & Affection" ||
        categoryOf[id] === "Connection & Togetherness";
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

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

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

// ---------------------------------------------------------------------------
// Section 1: legacy fixed-40 comparison (Elo vs BT, old vs adaptive pairing)
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
  for (let round = 0; round < MIN_COMPARISONS; round++) {
    const [a, b] = selectNextPair(ids, history);
    history.push(simulateChoice(trueStrength, a, b));
  }
  const fit = fitBradleyTerry(ids, history);
  return [...ids].sort((x, y) => fit.strength[y] - fit.strength[x]);
}

const LEGACY_CONFIGS: { name: string; run: (trueStrength: Record<string, number>) => string[] }[] = [
  { name: "(a) Elo + old pairing", run: runConfigA },
  { name: "(b) Bradley-Terry + old pairing", run: runConfigB },
  { name: "(c) Bradley-Terry + adaptive pairing (fixed 40)", run: runConfigC },
];

interface RankingMetrics {
  top5Overlap: number;
  top10Overlap: number;
  kendallTau: number;
  meanAbsRankErrorTop10: number;
}

function computeRankingMetrics(trueOrder: string[], computedOrder: string[]): RankingMetrics {
  const trueTop5 = trueOrder.slice(0, 5);
  const trueTop10 = trueOrder.slice(0, 10);
  const compTop5 = new Set(computedOrder.slice(0, 5));
  const compTop10 = new Set(computedOrder.slice(0, 10));

  const trueRank = new Map(trueOrder.map((id, i) => [id, i + 1]));
  const compRank = new Map(computedOrder.map((id, i) => [id, i + 1]));
  const meanAbsRankErrorTop10 =
    trueTop10.reduce((sum, id) => sum + Math.abs(trueRank.get(id)! - compRank.get(id)!), 0) /
    trueTop10.length;

  return {
    top5Overlap: trueTop5.filter((id) => compTop5.has(id)).length,
    top10Overlap: trueTop10.filter((id) => compTop10.has(id)).length,
    kendallTau: kendallTau(trueOrder, computedOrder),
    meanAbsRankErrorTop10,
  };
}

const N_TRIALS_LEGACY = 300;

function runLegacySection(): void {
  console.log("\n\n########## SECTION 1: legacy fixed-40 comparison ##########");

  const aggregate: Record<string, RankingMetrics[]> = Object.fromEntries(
    LEGACY_CONFIGS.map((c) => [c.name, []])
  );

  for (let profileIndex = 0; profileIndex < PROFILES.length; profileIndex++) {
    const profile = PROFILES[profileIndex];
    const trueOrder = [...NEED_IDS].sort(
      (a, b) => profile.trueStrength[b] - profile.trueStrength[a]
    );

    console.log(`\n=== Profile: ${profile.name} ===`);
    const rows: Record<string, unknown>[] = [];

    for (const config of LEGACY_CONFIGS) {
      const trials: RankingMetrics[] = [];
      for (let trial = 0; trial < N_TRIALS_LEGACY; trial++) {
        const seed = profileIndex * 100000 + trial;
        const computedOrder = withSeed(seed, () => config.run(profile.trueStrength));
        trials.push(computeRankingMetrics(trueOrder, computedOrder));
      }
      aggregate[config.name].push(...trials);

      rows.push({
        Configuration: config.name,
        "Top-5 avg overlap (/5)": average(trials.map((t) => t.top5Overlap)).toFixed(2),
        "Top-10 avg overlap (/10)": average(trials.map((t) => t.top10Overlap)).toFixed(2),
        "Kendall's tau": average(trials.map((t) => t.kendallTau)).toFixed(3),
        "Mean |rank error| (top 10)": average(trials.map((t) => t.meanAbsRankErrorTop10)).toFixed(2),
      });
    }

    console.table(rows);
  }

  console.log(`\n=== Section 1 aggregate across all ${PROFILES.length} profiles (${N_TRIALS_LEGACY} trials each) ===`);
  const aggregateRows = LEGACY_CONFIGS.map((config) => {
    const trials = aggregate[config.name];
    return {
      Configuration: config.name,
      "Top-5 avg overlap (/5)": average(trials.map((t) => t.top5Overlap)).toFixed(2),
      "Top-10 avg overlap (/10)": average(trials.map((t) => t.top10Overlap)).toFixed(2),
      "Kendall's tau": average(trials.map((t) => t.kendallTau)).toFixed(3),
      "Mean |rank error| (top 10)": average(trials.map((t) => t.meanAbsRankErrorTop10)).toFixed(2),
    };
  });
  console.table(aggregateRows);
}

// ---------------------------------------------------------------------------
// Section 2: adaptive stopping parameter sweep
// ---------------------------------------------------------------------------

const N_TRIALS_ADAPTIVE = 50;

const MIN_EXPOSURE_GRID = [2, 4];
const Z_THRESHOLD_GRID = [0.3, 0.5, 0.8, 1.0, 1.2, 1.5, 1.8];
const STABILITY_CHECKPOINTS_REQUIRED = 2; // fixed per spec's example; not swept

interface AdaptiveTrialResult {
  stopCount: number;
  resultType: "CLEAR_TOP3" | "CLUSTERED_TOP" | "CONTINUE";
  topCandidates: string[];
  finalOrder: string[];
}

function runAdaptiveTrial(
  ids: string[],
  trueStrength: Record<string, number>,
  config: ConfidenceConfig
): AdaptiveTrialResult {
  const history: ComparisonRecord[] = [];
  for (let round = 1; round <= config.maxComparisons; round++) {
    const [a, b] = selectNextPair(ids, history);
    history.push(simulateChoice(trueStrength, a, b));

    if (config.evaluationCheckpoints.includes(history.length)) {
      const confidence = evaluateAssessmentConfidence(ids, history, config);
      if (confidence.shouldStop) {
        const fit = fitBradleyTerry(ids, history);
        const finalOrder = [...ids].sort((x, y) => fit.strength[y] - fit.strength[x]);
        return {
          stopCount: history.length,
          resultType: confidence.resultType,
          topCandidates: confidence.topCandidates,
          finalOrder,
        };
      }
    }
  }
  // Defensive fallback — evaluateAssessmentConfidence always forces a stop at
  // config.maxComparisons, so this should be unreachable.
  const fit = fitBradleyTerry(ids, history);
  const finalOrder = [...ids].sort((x, y) => fit.strength[y] - fit.strength[x]);
  return { stopCount: history.length, resultType: "CLUSTERED_TOP", topCandidates: finalOrder.slice(0, 3), finalOrder };
}

interface AdaptiveAggregate {
  minExposure: number;
  zThreshold: number;
  avgStop: number;
  medianStop: number;
  pctByCheckpoint: Record<number, number>;
  pctClustered: number;
  top3ExactRecoveryRate: number;
  falseConfidenceRate: number;
  top3MembershipOverlap: number;
  top5Overlap: number;
  top10Overlap: number;
  kendallTau: number;
  meanAbsRankErrorTop10: number;
}

function runAdaptiveSweep(): AdaptiveAggregate[] {
  console.log("\n\n########## SECTION 2: adaptive stopping parameter sweep ##########");

  const results: AdaptiveAggregate[] = [];
  const totalConfigs = MIN_EXPOSURE_GRID.length * Z_THRESHOLD_GRID.length;
  let configIndex = 0;
  const startTime = Date.now();

  for (const minExposure of MIN_EXPOSURE_GRID) {
    for (const zThreshold of Z_THRESHOLD_GRID) {
      configIndex++;
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(
        `\n[${configIndex}/${totalConfigs}] minExposure=${minExposure} zThreshold=${zThreshold} (elapsed ${elapsedSec}s)`
      );

      // No extension in this sweep — standard and hard ceiling are the same
      // (60), reproducing the original "hard 60-comparison cap" behavior.
      const config: ConfidenceConfig = {
        minExposure,
        separationZThreshold: zThreshold,
        stabilityCheckpointsRequired: STABILITY_CHECKPOINTS_REQUIRED,
        evaluationCheckpoints: EVALUATION_CHECKPOINTS,
        standardMaxComparisons: STANDARD_MAX_COMPARISONS,
        maxComparisons: STANDARD_MAX_COMPARISONS,
      };

      const stopCounts: number[] = [];
      const checkpointCounts: Record<number, number> = Object.fromEntries(
        EVALUATION_CHECKPOINTS.map((c) => [c, 0])
      );
      let clusteredCount = 0;
      let exactRecoveryCount = 0;
      let falseConfidenceCount = 0;
      const top3OverlapValues: number[] = [];
      const rankingMetricsAll: RankingMetrics[] = [];
      let totalTrials = 0;

      for (let profileIndex = 0; profileIndex < PROFILES.length; profileIndex++) {
        const profile = PROFILES[profileIndex];
        const trueOrder = [...NEED_IDS].sort(
          (a, b) => profile.trueStrength[b] - profile.trueStrength[a]
        );
        const trueTop3 = new Set(trueOrder.slice(0, 3));

        for (let trial = 0; trial < N_TRIALS_ADAPTIVE; trial++) {
          const seed = profileIndex * 100000 + trial;
          const result = withSeed(seed, () =>
            runAdaptiveTrial([...NEED_IDS], profile.trueStrength, config)
          );
          totalTrials++;

          stopCounts.push(result.stopCount);
          checkpointCounts[result.stopCount] = (checkpointCounts[result.stopCount] ?? 0) + 1;
          if (result.resultType === "CLUSTERED_TOP") clusteredCount++;

          const overlap = result.topCandidates.filter((id) => trueTop3.has(id)).length;
          top3OverlapValues.push(overlap);

          if (result.resultType === "CLEAR_TOP3") {
            if (overlap === 3) exactRecoveryCount++;
            else falseConfidenceCount++;
          }

          rankingMetricsAll.push(computeRankingMetrics(trueOrder, result.finalOrder));
        }
      }

      const pctByCheckpoint: Record<number, number> = {};
      for (const checkpoint of EVALUATION_CHECKPOINTS) {
        pctByCheckpoint[checkpoint] = (checkpointCounts[checkpoint] / totalTrials) * 100;
      }

      results.push({
        minExposure,
        zThreshold,
        avgStop: average(stopCounts),
        medianStop: median(stopCounts),
        pctByCheckpoint,
        pctClustered: (clusteredCount / totalTrials) * 100,
        top3ExactRecoveryRate: (exactRecoveryCount / totalTrials) * 100,
        falseConfidenceRate: (falseConfidenceCount / totalTrials) * 100,
        top3MembershipOverlap: average(top3OverlapValues),
        top5Overlap: average(rankingMetricsAll.map((m) => m.top5Overlap)),
        top10Overlap: average(rankingMetricsAll.map((m) => m.top10Overlap)),
        kendallTau: average(rankingMetricsAll.map((m) => m.kendallTau)),
        meanAbsRankErrorTop10: average(rankingMetricsAll.map((m) => m.meanAbsRankErrorTop10)),
      });
    }
  }

  return results;
}

function printAdaptiveResults(results: AdaptiveAggregate[]): void {
  const rows = results.map((r) => ({
    "Min exposure": r.minExposure,
    "Z threshold": r.zThreshold,
    "Avg stop": r.avgStop.toFixed(1),
    "Median stop": r.medianStop.toFixed(0),
    "% @40": r.pctByCheckpoint[40].toFixed(0),
    "% @45": r.pctByCheckpoint[45].toFixed(0),
    "% @50": r.pctByCheckpoint[50].toFixed(0),
    "% @55": r.pctByCheckpoint[55].toFixed(0),
    "% @60": r.pctByCheckpoint[60].toFixed(0),
    "% clustered (no clear top3)": r.pctClustered.toFixed(1),
    "Top3 exact recovery %": r.top3ExactRecoveryRate.toFixed(1),
    "FALSE CONFIDENCE %": r.falseConfidenceRate.toFixed(1),
    "Top3 membership overlap (/3)": r.top3MembershipOverlap.toFixed(2),
    "Top5 overlap (/5)": r.top5Overlap.toFixed(2),
    "Top10 overlap (/10)": r.top10Overlap.toFixed(2),
    "Kendall's tau": r.kendallTau.toFixed(3),
    "Mean |rank error| top10": r.meanAbsRankErrorTop10.toFixed(2),
  }));
  console.table(rows);
}

// ---------------------------------------------------------------------------
// Section 3: tied-for-#1 extension analysis
//
// At the recommended base config, how often is #1 itself still tied at the
// standard 60-comparison ceiling, how many extra comparisons does resolving
// it actually cost, and does extending the ceiling actually resolve the tie
// (vs just burning more comparisons without ever separating #1)?
// ---------------------------------------------------------------------------

const RECOMMENDED_MIN_EXPOSURE = 3;
const RECOMMENDED_Z_THRESHOLD = 1.0;
const EXTENDED_CAP_GRID = [70, 80, 100];
const N_TRIALS_EXTENSION = 50;

function extendedCheckpointsUpTo(cap: number): number[] {
  return [...EVALUATION_CHECKPOINTS, ...EXTENDED_EVALUATION_CHECKPOINTS.filter((c) => c <= cap)];
}

interface ExtensionAggregate {
  extendedCap: number;
  pctNeededExtension: number;
  avgExtraComparisonsIfNeeded: number;
  pctTieResolvedAmongExtended: number;
  avgStopOverall: number;
  top3ExactRecoveryRate: number;
  falseConfidenceRate: number;
}

function runExtensionAnalysis(): ExtensionAggregate[] {
  console.log("\n\n########## SECTION 3: tied-for-#1 extension analysis ##########");
  console.log(
    `Base config: minExposure=${RECOMMENDED_MIN_EXPOSURE}, zThreshold=${RECOMMENDED_Z_THRESHOLD}, stability=${STABILITY_CHECKPOINTS_REQUIRED}\n`
  );

  const results: ExtensionAggregate[] = [];

  for (const extendedCap of EXTENDED_CAP_GRID) {
    const config: ConfidenceConfig = {
      minExposure: RECOMMENDED_MIN_EXPOSURE,
      separationZThreshold: RECOMMENDED_Z_THRESHOLD,
      stabilityCheckpointsRequired: STABILITY_CHECKPOINTS_REQUIRED,
      evaluationCheckpoints: extendedCheckpointsUpTo(extendedCap),
      standardMaxComparisons: STANDARD_MAX_COMPARISONS,
      maxComparisons: extendedCap,
    };

    const stopCounts: number[] = [];
    const extraComparisonsIfNeeded: number[] = [];
    let neededExtensionCount = 0;
    let tieResolvedCount = 0;
    let exactRecoveryCount = 0;
    let falseConfidenceCount = 0;
    let totalTrials = 0;

    for (let profileIndex = 0; profileIndex < PROFILES.length; profileIndex++) {
      const profile = PROFILES[profileIndex];
      const trueTop3 = new Set(
        [...NEED_IDS].sort((a, b) => profile.trueStrength[b] - profile.trueStrength[a]).slice(0, 3)
      );

      for (let trial = 0; trial < N_TRIALS_EXTENSION; trial++) {
        const seed = profileIndex * 100000 + trial;
        const result = withSeed(seed, () =>
          runAdaptiveTrial([...NEED_IDS], profile.trueStrength, config)
        );
        totalTrials++;
        stopCounts.push(result.stopCount);

        const neededExtension = result.stopCount > STANDARD_MAX_COMPARISONS;
        if (neededExtension) {
          neededExtensionCount++;
          extraComparisonsIfNeeded.push(result.stopCount - STANDARD_MAX_COMPARISONS);
          const tieStillUnresolved =
            result.resultType === "CLUSTERED_TOP" && result.topCandidates.length > 1;
          if (!tieStillUnresolved) tieResolvedCount++;
        }

        const overlap = result.topCandidates.filter((id) => trueTop3.has(id)).length;
        if (result.resultType === "CLEAR_TOP3") {
          if (overlap === 3) exactRecoveryCount++;
          else falseConfidenceCount++;
        }
      }
    }

    results.push({
      extendedCap,
      pctNeededExtension: (neededExtensionCount / totalTrials) * 100,
      avgExtraComparisonsIfNeeded:
        extraComparisonsIfNeeded.length > 0 ? average(extraComparisonsIfNeeded) : 0,
      pctTieResolvedAmongExtended:
        neededExtensionCount > 0 ? (tieResolvedCount / neededExtensionCount) * 100 : 0,
      avgStopOverall: average(stopCounts),
      top3ExactRecoveryRate: (exactRecoveryCount / totalTrials) * 100,
      falseConfidenceRate: (falseConfidenceCount / totalTrials) * 100,
    });
  }

  return results;
}

function printExtensionResults(results: ExtensionAggregate[]): void {
  const rows = results.map((r) => ({
    "Extended cap": r.extendedCap,
    "% trials needing extension (tied @60)": r.pctNeededExtension.toFixed(1),
    "Avg extra comparisons (if needed)": r.avgExtraComparisonsIfNeeded.toFixed(1),
    "% of those where tie resolved": r.pctTieResolvedAmongExtended.toFixed(1),
    "Avg stop overall": r.avgStopOverall.toFixed(1),
    "Top3 exact recovery %": r.top3ExactRecoveryRate.toFixed(1),
    "FALSE CONFIDENCE %": r.falseConfidenceRate.toFixed(1),
  }));
  console.table(rows);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

runLegacySection();
const adaptiveResults = runAdaptiveSweep();
console.log(
  `\n=== Section 2: adaptive stopping sweep (${MIN_EXPOSURE_GRID.length}×${Z_THRESHOLD_GRID.length} configs, ${N_TRIALS_ADAPTIVE} trials/profile, ${PROFILES.length} profiles, stability=${STABILITY_CHECKPOINTS_REQUIRED}) ===`
);
printAdaptiveResults(adaptiveResults);

const zeroFalseConfidence = adaptiveResults.filter((r) => r.falseConfidenceRate === 0);
const candidatePool = zeroFalseConfidence.length > 0 ? zeroFalseConfidence : adaptiveResults;
const best = [...candidatePool].sort((a, b) => {
  if (a.falseConfidenceRate !== b.falseConfidenceRate) return a.falseConfidenceRate - b.falseConfidenceRate;
  if (b.top3ExactRecoveryRate !== a.top3ExactRecoveryRate) return b.top3ExactRecoveryRate - a.top3ExactRecoveryRate;
  return a.avgStop - b.avgStop;
})[0];
console.log(
  `\nLowest-false-confidence / best-recovery config found: minExposure=${best.minExposure}, zThreshold=${best.zThreshold} ` +
    `(false confidence ${best.falseConfidenceRate.toFixed(1)}%, exact recovery ${best.top3ExactRecoveryRate.toFixed(1)}%, avg stop ${best.avgStop.toFixed(1)})`
);

const extensionResults = runExtensionAnalysis();
printExtensionResults(extensionResults);
