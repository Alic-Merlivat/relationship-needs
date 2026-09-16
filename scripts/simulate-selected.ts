/**
 * Does 36 comparisons actually rank 10 self-chosen needs?
 *
 * The earlier harness answered a different question — 46 needs, adaptive
 * stopping — and its finding was that a Top 3 essentially never separates
 * at that scale. This one models the shipped flow: a person picks 10 needs
 * they already care about, then ranks only those.
 *
 * Two things make that a harder test than it sounds. A self-chosen set is
 * pre-filtered, so the true strengths are compressed — these are all needs
 * the person rates highly, which is exactly when a ranker struggles. And
 * the answers are noisy: choices are drawn from the Bradley-Terry model
 * itself, so a weaker need genuinely wins sometimes.
 *
 * Run with: npx tsx scripts/simulate-selected.ts
 */

import { selectNextPair } from "../src/lib/adaptivePairing";
import { fitBradleyTerry, type ComparisonRecord } from "../src/lib/bradleyTerry";
import { evaluateAssessmentConfidence } from "../src/lib/confidence";
import { COMPARISON_COUNT, SELECTION_CONFIDENCE_CONFIG } from "../src/lib/selection";

const TRIALS = 300;
const ITEMS = 10;

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ids = Array.from({ length: ITEMS }, (_, i) => `n${i}`);

/**
 * True log-strengths. Profiles are deliberately tight: a person choosing
 * their own top 10 does not hand us a set with an obvious runaway winner.
 */
const PROFILES: Record<string, number[]> = {
  // A real favourite, then a gentle slope.
  "clear favourite": [2.2, 1.2, 0.9, 0.6, 0.4, 0.2, 0.0, -0.2, -0.5, -0.9],
  // Evenly spaced — the honest average case.
  "gradual slope": [1.8, 1.4, 1.0, 0.6, 0.2, -0.2, -0.6, -1.0, -1.4, -1.8],
  // Three near-identical leaders: the case where a confident Top 3 would be a lie.
  "tied at the top": [1.2, 1.15, 1.1, 0.3, 0.1, -0.1, -0.3, -0.6, -0.9, -1.2],
  // Almost no signal at all.
  "flat": [0.4, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2, -0.3, -0.4, -0.5],
  // One standout among equals.
  "one standout": [2.5, 0.2, 0.15, 0.1, 0.05, 0.0, -0.05, -0.1, -0.15, -0.2],
};

function kendallTau(a: string[], b: string[]): number {
  const rankB = new Map(b.map((id, i) => [id, i]));
  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      const diff = rankB.get(a[i])! - rankB.get(a[j])!;
      if (diff < 0) concordant++;
      else discordant++;
    }
  }
  return (concordant - discordant) / (concordant + discordant);
}

interface Row {
  profile: string;
  top1: string;
  top3Exact: string;
  top3Overlap: string;
  tau: string;
  claimedClear: string;
  falseConfidence: string;
}

const rows: Row[] = [];

for (const [profile, strengths] of Object.entries(PROFILES)) {
  const trueStrength = Object.fromEntries(ids.map((id, i) => [id, strengths[i]]));
  const trueOrder = [...ids].sort((a, b) => trueStrength[b] - trueStrength[a]);
  const trueTop3 = new Set(trueOrder.slice(0, 3));

  let top1Hits = 0;
  let top3Exact = 0;
  let overlapTotal = 0;
  let tauTotal = 0;
  let claimedClear = 0;
  let claimedClearButWrong = 0;

  for (let trial = 0; trial < TRIALS; trial++) {
    const rand = mulberry32(trial * 7919 + profile.length);
    const realRandom = Math.random;
    // selectNextPair shuffles internally; hijacking keeps trials reproducible.
    Math.random = rand;

    const history: ComparisonRecord[] = [];
    for (let round = 0; round < COMPARISON_COUNT; round++) {
      const [a, b] = selectNextPair(ids, history, COMPARISON_COUNT);
      const pA = 1 / (1 + Math.exp(-(trueStrength[a] - trueStrength[b])));
      if (rand() < pA) history.push({ winnerId: a, loserId: b });
      else history.push({ winnerId: b, loserId: a });
    }

    Math.random = realRandom;

    const fit = fitBradleyTerry(ids, history);
    const estimated = [...ids].sort((a, b) => fit.strength[b] - fit.strength[a]);
    const estTop3 = new Set(estimated.slice(0, 3));

    if (estimated[0] === trueOrder[0]) top1Hits++;
    const overlap = [...estTop3].filter((id) => trueTop3.has(id)).length;
    overlapTotal += overlap;
    if (overlap === 3) top3Exact++;
    tauTotal += kendallTau(estimated, trueOrder);

    const confidence = evaluateAssessmentConfidence(
      ids,
      history,
      SELECTION_CONFIDENCE_CONFIG
    );
    if (confidence.resultType === "CLEAR_TOP3") {
      claimedClear++;
      if (overlap !== 3) claimedClearButWrong++;
    }
  }

  rows.push({
    profile,
    top1: `${((top1Hits / TRIALS) * 100).toFixed(1)}%`,
    top3Exact: `${((top3Exact / TRIALS) * 100).toFixed(1)}%`,
    top3Overlap: (overlapTotal / TRIALS).toFixed(2) + " / 3",
    tau: (tauTotal / TRIALS).toFixed(3),
    claimedClear: `${((claimedClear / TRIALS) * 100).toFixed(1)}%`,
    falseConfidence:
      claimedClear === 0
        ? "—"
        : `${((claimedClearButWrong / claimedClear) * 100).toFixed(1)}%`,
  });
}

console.log(
  `\n${ITEMS} selected needs · ${COMPARISON_COUNT} comparisons · ${TRIALS} trials per profile\n`
);
console.table(rows);
// --- Sanity check + budget sweep ------------------------------------------
//
// Two questions the table above can't answer on its own: is the estimator
// actually working (does it nail an easy case?), and would simply asking
// more questions fix the tight ones?

function runOnce(strengths: number[], budget: number, trial: number) {
  const trueStrength = Object.fromEntries(ids.map((id, i) => [id, strengths[i]]));
  const trueOrder = [...ids].sort((a, b) => trueStrength[b] - trueStrength[a]);
  const trueTop3 = new Set(trueOrder.slice(0, 3));

  const rand = mulberry32(trial * 7919 + budget);
  const realRandom = Math.random;
  Math.random = rand;

  const history: ComparisonRecord[] = [];
  for (let round = 0; round < budget; round++) {
    const [a, b] = selectNextPair(ids, history, budget);
    const pA = 1 / (1 + Math.exp(-(trueStrength[a] - trueStrength[b])));
    history.push(
      rand() < pA ? { winnerId: a, loserId: b } : { winnerId: b, loserId: a }
    );
  }
  Math.random = realRandom;

  const fit = fitBradleyTerry(ids, history);
  const estimated = [...ids].sort((a, b) => fit.strength[b] - fit.strength[a]);
  const overlap = estimated.slice(0, 3).filter((id) => trueTop3.has(id)).length;
  return {
    top1: estimated[0] === trueOrder[0],
    exact: overlap === 3,
    tau: kendallTau(estimated, trueOrder),
  };
}

const WIDE = [4.0, 3.0, 2.0, 0.5, 0.0, -0.5, -1.0, -2.0, -3.0, -4.0];
const sweep: Record<string, string>[] = [];

for (const [label, strengths] of [
  ["wide gaps (sanity)", WIDE],
  ["gradual slope", PROFILES["gradual slope"]],
] as const) {
  for (const budget of [24, 36, 45]) {
    let top1 = 0;
    let exact = 0;
    let tau = 0;
    for (let t = 0; t < TRIALS; t++) {
      const r = runOnce(strengths as number[], budget, t);
      if (r.top1) top1++;
      if (r.exact) exact++;
      tau += r.tau;
    }
    sweep.push({
      profile: label,
      comparisons: String(budget),
      top1: `${((top1 / TRIALS) * 100).toFixed(1)}%`,
      top3Exact: `${((exact / TRIALS) * 100).toFixed(1)}%`,
      tau: (tau / TRIALS).toFixed(3),
    });
  }
}

console.log("\nSanity check and budget sweep\n");
console.table(sweep);

console.log(
  [
    "",
    "top1            how often the true #1 came out on top",
    "top3Exact       how often the Top 3 set was exactly right",
    "top3Overlap     average number of the true Top 3 recovered",
    "tau             Kendall's tau against the true order (1.0 = perfect)",
    "claimedClear    how often the app reported CLEAR_TOP3 rather than CLUSTERED_TOP",
    "falseConfidence of those CLEAR_TOP3 claims, how many were actually wrong",
    "",
  ].join("\n")
);
