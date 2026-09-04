import { NEEDS } from "@/data/needs";
import { selectNextPair } from "@/lib/adaptivePairing";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import {
  evaluateAssessmentConfidence,
  EXTENDED_MAX_COMPARISONS,
  MIN_COMPARISONS,
  type AssessmentConfidence,
} from "@/lib/confidence";
import { buildRanking } from "@/lib/ranking";
import type { Pair } from "@/lib/pairing";

export { MIN_COMPARISONS, EXTENDED_MAX_COMPARISONS };

// Bumped for the 9-Core-Need taxonomy: card ids changed, so older blobs
// reference needs that no longer exist.
const ASSESSMENT_KEY = "rn-assessment-state-v4";
const RESULTS_KEY = "rn-results-v3";
const PARTNER_RANKS_KEY = "rn-partner-ranks-v3";

const KNOWN_NEED_IDS = new Set(NEEDS.map((n) => n.id));

/**
 * Guards against stored history referencing needs that no longer exist —
 * downstream ranking assumes every id resolves to a card, so a stale blob
 * would otherwise crash the results page rather than restart cleanly.
 */
function referencesOnlyKnownNeeds(history: ComparisonRecord[]): boolean {
  return history.every(
    (record) =>
      KNOWN_NEED_IDS.has(record?.winnerId) && KNOWN_NEED_IDS.has(record?.loserId)
  );
}

export interface AssessmentState {
  history: ComparisonRecord[];
  currentPair: Pair | null;
  /** Confidence snapshot from the most recent evaluation checkpoint, if any. */
  confidence: AssessmentConfidence | null;
}

export function createAssessmentState(): AssessmentState {
  const ids = NEEDS.map((n) => n.id);
  return {
    history: [],
    currentPair: selectNextPair(ids, []),
    confidence: null,
  };
}

/**
 * Records a choice, then either picks the next pair or stops the
 * assessment. Stopping is decided by `evaluateAssessmentConfidence` at each
 * evaluation checkpoint (40, 45, 50, 55, 60) — the assessment never stops
 * before 40, and always stops by 60 regardless of outcome.
 */
export function advanceAssessment(
  state: AssessmentState,
  winnerId: string,
  loserId: string
): AssessmentState {
  const history = [...state.history, { winnerId, loserId }];
  const ids = NEEDS.map((n) => n.id);

  let confidence: AssessmentConfidence | null = state.confidence;
  if (history.length >= MIN_COMPARISONS) {
    confidence = evaluateAssessmentConfidence(ids, history);
  }

  const currentPair = confidence?.shouldStop ? null : selectNextPair(ids, history);
  return { history, currentPair, confidence };
}

export function loadAssessmentState(): AssessmentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ASSESSMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssessmentState;
    if (!parsed || !Array.isArray(parsed.history)) return null;
    if (!referencesOnlyKnownNeeds(parsed.history)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAssessmentState(state: AssessmentState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ASSESSMENT_KEY, JSON.stringify(state));
}

export function clearAssessmentState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ASSESSMENT_KEY);
}

export function saveResults(history: ComparisonRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify({ history }));
}

export function loadResults(): ComparisonRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESULTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { history?: ComparisonRecord[] };
    if (!parsed || !Array.isArray(parsed.history)) return null;
    if (!referencesOnlyKnownNeeds(parsed.history)) return null;
    return parsed.history;
  } catch {
    return null;
  }
}

export function clearResults(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RESULTS_KEY);
}

/** Packs each need's final rank (1-30, fixed NEEDS order) into a URL-safe string. */
export function encodeShareableRanks(history: ComparisonRecord[]): string {
  const ranking = buildRanking(history);
  const rankById = new Map(ranking.map((r) => [r.id, r.rank]));
  const bytes = new Uint8Array(NEEDS.length);
  NEEDS.forEach((need, i) => {
    bytes[i] = rankById.get(need.id) ?? 0;
  });
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShareableRanks(code: string): Record<string, number> | null {
  try {
    let base64 = code.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const binary = atob(base64);
    if (binary.length !== NEEDS.length) return null;
    const result: Record<string, number> = {};
    NEEDS.forEach((need, i) => {
      result[need.id] = binary.charCodeAt(i);
    });
    return result;
  } catch {
    return null;
  }
}

export function savePartnerRanks(ranks: Record<string, number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARTNER_RANKS_KEY, JSON.stringify(ranks));
}

export function loadPartnerRanks(): Record<string, number> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PARTNER_RANKS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return null;
  }
}

export function clearPartnerRanks(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PARTNER_RANKS_KEY);
}
