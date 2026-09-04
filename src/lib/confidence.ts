import {
  computeTieBands,
  fitBradleyTerry,
  zScoreBetween,
  type ComparisonRecord,
} from "@/lib/bradleyTerry";

export const MIN_COMPARISONS = 40;

/** The normal ceiling: always enough to stop here UNLESS the very top is itself tied. */
export const STANDARD_MAX_COMPARISONS = 60;

/**
 * True hard ceiling — always stops here regardless of outcome. Only ever
 * reached when #1 is still tied at STANDARD_MAX_COMPARISONS; tunable via
 * simulation.
 */
export const EXTENDED_MAX_COMPARISONS = 80;

/** Comparison counts at which the stop condition is evaluated up to the standard ceiling. */
export const EVALUATION_CHECKPOINTS = [40, 45, 50, 55, 60] as const;

/** Additional checkpoints used only when #1 is still tied at 60. */
export const EXTENDED_EVALUATION_CHECKPOINTS = [65, 70, 75, 80] as const;

export const ALL_EVALUATION_CHECKPOINTS = [
  ...EVALUATION_CHECKPOINTS,
  ...EXTENDED_EVALUATION_CHECKPOINTS,
] as const;

/**
 * Minimum number of real comparisons each current Top-3 need must have
 * before its placement counts as evidenced, rather than a lucky early
 * record. Tunable — validate via the simulation harness.
 */
export const TOP3_MIN_EXPOSURE = 3;

/**
 * z-score the #3-vs-#4 gap must clear before the Top 3 is considered
 * separated from the rest. Deliberately not the conventional 1.96 —
 * validate the practical tradeoff via the simulation harness.
 */
export const TOP3_SEPARATION_Z_THRESHOLD = 1.2;

/** How many consecutive checkpoints must agree on Top-3 membership before it counts as stable. */
export const STABILITY_CHECKPOINTS_REQUIRED = 2;

export interface ConfidenceConfig {
  minExposure: number;
  separationZThreshold: number;
  stabilityCheckpointsRequired: number;
  evaluationCheckpoints: readonly number[];
  /** Force-stop here UNLESS #1 is itself still tied. */
  standardMaxComparisons: number;
  /** True hard ceiling — always stops here regardless of outcome. */
  maxComparisons: number;
}

export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  minExposure: TOP3_MIN_EXPOSURE,
  separationZThreshold: TOP3_SEPARATION_Z_THRESHOLD,
  stabilityCheckpointsRequired: STABILITY_CHECKPOINTS_REQUIRED,
  evaluationCheckpoints: ALL_EVALUATION_CHECKPOINTS,
  standardMaxComparisons: STANDARD_MAX_COMPARISONS,
  maxComparisons: EXTENDED_MAX_COMPARISONS,
};

export type ResultType = "CLEAR_TOP3" | "CLUSTERED_TOP" | "CONTINUE";

export interface AssessmentConfidence {
  shouldStop: boolean;
  comparisonCount: number;
  resultType: ResultType;
  /** Top 3 ids for CLEAR_TOP3, the leading tie-band for CLUSTERED_TOP, current best guess for CONTINUE. */
  topCandidates: string[];
  stableTop3: boolean;
  separationZ: number | null;
  evidenceSufficient: boolean;
  reason: string;
}

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

function top3At(ids: string[], history: ComparisonRecord[]): Set<string> {
  const fit = fitBradleyTerry(ids, history);
  const sorted = [...ids].sort((a, b) => fit.strength[b] - fit.strength[a]);
  return new Set(sorted.slice(0, 3));
}

/**
 * Checks whether the current Top 3 has held the same membership across the
 * required number of consecutive evaluation checkpoints (including the
 * current one). Recomputed from `history` sliced at each prior checkpoint —
 * no separate state needed, per "derive everything from raw history."
 */
function isTop3Stable(
  ids: string[],
  history: ComparisonRecord[],
  currentTop3: Set<string>,
  config: ConfidenceConfig
): boolean {
  const n = history.length;
  const checkpointIndex = config.evaluationCheckpoints.indexOf(n);
  const required = config.stabilityCheckpointsRequired;

  if (checkpointIndex < 0) return false;
  if (checkpointIndex + 1 < required) return false; // not enough checkpoints have happened yet

  const priorCheckpoints = config.evaluationCheckpoints.slice(
    checkpointIndex - required + 1,
    checkpointIndex
  );

  return priorCheckpoints.every((checkpoint) =>
    setEquals(top3At(ids, history.slice(0, checkpoint)), currentTop3)
  );
}

/**
 * Evaluates whether the assessment has enough evidence to stop, given the
 * complete raw comparison history. Pure function of (ids, history, config) —
 * safe to call from the live assessment flow and from simulation alike.
 * Intended to be called only when `history.length` is one of
 * `config.evaluationCheckpoints`; calling it off-checkpoint just reports
 * CONTINUE without evaluating anything.
 */
export function evaluateAssessmentConfidence(
  ids: string[],
  history: ComparisonRecord[],
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): AssessmentConfidence {
  const n = history.length;
  const isCheckpoint = config.evaluationCheckpoints.includes(n);
  const atHardMax = n >= config.maxComparisons;
  const atStandardMax = n >= config.standardMaxComparisons;

  const fit = fitBradleyTerry(ids, history);
  const sorted = [...ids].sort((a, b) => fit.strength[b] - fit.strength[a]);
  const top3 = sorted.slice(0, 3);
  const rank4 = sorted[3];

  if (!isCheckpoint) {
    return {
      shouldStop: false,
      comparisonCount: n,
      resultType: "CONTINUE",
      topCandidates: top3,
      stableTop3: false,
      separationZ: null,
      evidenceSufficient: false,
      reason: "Not an evaluation checkpoint.",
    };
  }

  const evidenceSufficient = top3.every((id) => fit.appearances[id] >= config.minExposure);
  const separationZ = rank4 !== undefined ? zScoreBetween(fit, top3[2], rank4) : Infinity;
  const separationOk = separationZ >= config.separationZThreshold;
  const stableTop3 = isTop3Stable(ids, history, new Set(top3), config);

  const isClearTop3 = evidenceSufficient && separationOk && stableTop3;

  if (isClearTop3) {
    return {
      shouldStop: true,
      comparisonCount: n,
      resultType: "CLEAR_TOP3",
      topCandidates: top3,
      stableTop3,
      separationZ,
      evidenceSufficient,
      reason:
        "Top 3 is sufficiently tested, statistically separated from #4, and stable across checkpoints.",
    };
  }

  const leadingCluster = computeTieBands(ids, fit, config.separationZThreshold)[0];
  const tiedForFirst = leadingCluster.length > 1;

  // At the standard ceiling, a clustered stop is only forced once #1 itself
  // is settled — if the very top spot is still tied, that's the one case
  // worth spending extra comparisons on, up to the true hard ceiling.
  if (atHardMax || (atStandardMax && !tiedForFirst)) {
    return {
      shouldStop: true,
      comparisonCount: n,
      resultType: "CLUSTERED_TOP",
      topCandidates: leadingCluster,
      stableTop3,
      separationZ,
      evidenceSufficient,
      reason: atHardMax
        ? "Reached the hard comparison ceiling without a clearly separated Top 3 — returning the leading cluster instead."
        : "Reached the standard comparison budget without a clearly separated Top 3 — returning the leading cluster instead.",
    };
  }

  const reason = !evidenceSufficient
    ? "Current Top 3 needs more head-to-head data before their placement counts as evidenced."
    : !separationOk
      ? tiedForFirst
        ? "#1 itself is still tied — continuing past the standard budget to try to resolve it."
        : "#3 is not yet statistically separated from #4."
      : "Top 3 membership hasn't held stable across consecutive checkpoints yet.";

  return {
    shouldStop: false,
    comparisonCount: n,
    resultType: "CONTINUE",
    topCandidates: top3,
    stableTop3,
    separationZ,
    evidenceSufficient,
    reason,
  };
}
