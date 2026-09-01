export interface ComparisonRecord {
  winnerId: string;
  loserId: string;
}

export type EvidenceTier = "strong" | "emerging" | "insufficient";

export interface BradleyTerryResult {
  ids: string[];
  strength: Record<string, number>;
  se: Record<string, number>;
  covariance: Record<string, Record<string, number>>;
  appearances: Record<string, number>;
  wins: Record<string, number>;
  losses: Record<string, number>;
  evidenceTier: Record<string, EvidenceTier>;
}

/** Virtual win + virtual loss every real need gets against the fixed anchor. */
export const PSEUDO_ANCHOR_MATCHES = 1;

const CONVERGENCE_THRESHOLD = 1e-9;
const MAX_ITERATIONS = 200;

const STRONG_SE_THRESHOLD = 0.7;
const EMERGING_SE_THRESHOLD = 1.0;

/** z-score below which two adjacent ranks are treated as a statistical tie. */
export const TIE_Z_THRESHOLD = 1.0;

function evidenceTierFromSE(se: number): EvidenceTier {
  if (se <= STRONG_SE_THRESHOLD) return "strong";
  if (se <= EMERGING_SE_THRESHOLD) return "emerging";
  return "insufficient";
}

function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > maxVal) {
        maxVal = Math.abs(aug[r][col]);
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    }
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[col][j];
    }
  }

  return aug.map((row) => row.slice(n));
}

/**
 * Fits a Bradley-Terry model over the complete comparison history via
 * Zermelo/MM iteration. A fixed anchor pseudo-item (strength = 1, never
 * updated) gives every real need one virtual win and one virtual loss —
 * this keeps the comparison graph connected and keeps every need's win
 * count strictly between 0 and its total games, so the fit never diverges
 * regardless of how one-sided a need's real record is. The result depends
 * only on aggregated per-pair win/loss counts, so it is order-independent
 * for a fixed set of history entries.
 */
export function fitBradleyTerry(
  ids: string[],
  history: ComparisonRecord[]
): BradleyTerryResult {
  const games = new Map<string, Map<string, number>>();
  const winsAgainst = new Map<string, Map<string, number>>();
  for (const id of ids) {
    games.set(id, new Map());
    winsAgainst.set(id, new Map());
  }

  const bump = (map: Map<string, Map<string, number>>, a: string, b: string) => {
    const row = map.get(a)!;
    row.set(b, (row.get(b) ?? 0) + 1);
  };

  for (const { winnerId, loserId } of history) {
    bump(games, winnerId, loserId);
    bump(games, loserId, winnerId);
    bump(winsAgainst, winnerId, loserId);
  }

  const realWins = (id: string): number => {
    let total = 0;
    for (const count of winsAgainst.get(id)!.values()) total += count;
    return total;
  };

  let p = new Map(ids.map((id) => [id, 1]));

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const next = new Map<string, number>();
    let maxRelChange = 0;

    for (const i of ids) {
      const W_i = realWins(i) + PSEUDO_ANCHOR_MATCHES;
      const p_i = p.get(i)!;
      let denom = (2 * PSEUDO_ANCHOR_MATCHES) / (p_i + 1); // anchor term, p_anchor = 1

      for (const [j, n_ij] of games.get(i)!) {
        denom += n_ij / (p_i + p.get(j)!);
      }

      const p_i_new = W_i / denom;
      next.set(i, p_i_new);
      maxRelChange = Math.max(maxRelChange, Math.abs(p_i_new / p_i - 1));
    }

    p = next;
    if (maxRelChange < CONVERGENCE_THRESHOLD) break;
  }

  const strength: Record<string, number> = {};
  for (const id of ids) strength[id] = Math.log(p.get(id)!);

  // Fisher information matrix over the real needs only (anchor strength is
  // fixed, not a free parameter, so it has no row/column of its own).
  const n = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const info: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const i of ids) {
    const iIdx = index.get(i)!;
    const p_i = p.get(i)!;

    const q_anchor = p_i / (p_i + 1);
    info[iIdx][iIdx] += 2 * PSEUDO_ANCHOR_MATCHES * q_anchor * (1 - q_anchor);

    for (const [j, n_ij] of games.get(i)!) {
      const jIdx = index.get(j)!;
      const p_j = p.get(j)!;
      const q_ij = p_i / (p_i + p_j);
      const term = n_ij * q_ij * (1 - q_ij);
      info[iIdx][iIdx] += term;
      if (iIdx !== jIdx) info[iIdx][jIdx] -= term;
    }
  }

  const cov = invertMatrix(info);

  const se: Record<string, number> = {};
  const covariance: Record<string, Record<string, number>> = {};
  const evidenceTier: Record<string, EvidenceTier> = {};
  for (const i of ids) {
    const iIdx = index.get(i)!;
    se[i] = Math.sqrt(Math.max(cov[iIdx][iIdx], 0));
    evidenceTier[i] = evidenceTierFromSE(se[i]);
    covariance[i] = {};
    for (const j of ids) {
      covariance[i][j] = cov[iIdx][index.get(j)!];
    }
  }

  const appearances: Record<string, number> = {};
  const wins: Record<string, number> = {};
  const losses: Record<string, number> = {};
  for (const id of ids) {
    const w = realWins(id);
    let l = 0;
    for (const [, count] of games.get(id)!) l += count;
    l -= w;
    wins[id] = w;
    losses[id] = l;
    appearances[id] = w + l;
  }

  return { ids, strength, se, covariance, appearances, wins, losses, evidenceTier };
}

/** z-score for the strength gap between two needs, accounting for their covariance. */
export function zScoreBetween(
  result: BradleyTerryResult,
  idA: string,
  idB: string
): number {
  const variance =
    result.se[idA] ** 2 + result.se[idB] ** 2 - 2 * result.covariance[idA][idB];
  const seDiff = Math.sqrt(Math.max(variance, 1e-9));
  return (result.strength[idA] - result.strength[idB]) / seDiff;
}
