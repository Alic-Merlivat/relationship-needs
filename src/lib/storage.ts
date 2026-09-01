import { NEEDS } from "@/data/needs";
import { selectNextPair, TOTAL_COMPARISONS as ADAPTIVE_TOTAL_COMPARISONS } from "@/lib/adaptivePairing";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { buildRanking } from "@/lib/ranking";
import type { Pair } from "@/lib/pairing";

export const TOTAL_COMPARISONS = ADAPTIVE_TOTAL_COMPARISONS;

const ASSESSMENT_KEY = "rn-assessment-state-v2";
const RESULTS_KEY = "rn-results-v2";
const PARTNER_RANKS_KEY = "rn-partner-ranks-v2";

export interface AssessmentState {
  history: ComparisonRecord[];
  currentPair: Pair | null;
}

export function createAssessmentState(): AssessmentState {
  const ids = NEEDS.map((n) => n.id);
  return {
    history: [],
    currentPair: selectNextPair(ids, []),
  };
}

/** Records a choice and picks the next pair, or null once the assessment is complete. */
export function advanceAssessment(
  state: AssessmentState,
  winnerId: string,
  loserId: string
): AssessmentState {
  const history = [...state.history, { winnerId, loserId }];
  const ids = NEEDS.map((n) => n.id);
  const currentPair =
    history.length >= TOTAL_COMPARISONS ? null : selectNextPair(ids, history);
  return { history, currentPair };
}

export function loadAssessmentState(): AssessmentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ASSESSMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssessmentState;
    if (!parsed || !Array.isArray(parsed.history)) return null;
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
