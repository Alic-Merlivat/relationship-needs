export type Pair = [string, string];

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

/**
 * Generates a sequence of comparison pairs that spreads appearances as
 * evenly as possible across all ids and avoids repeating the same pair.
 */
export function generatePairs(ids: string[], totalComparisons: number): Pair[] {
  const counts = new Map(ids.map((id) => [id, 0]));
  const used = new Set<string>();
  const pairs: Pair[] = [];

  for (let i = 0; i < totalComparisons; i++) {
    const ordered = shuffle(ids).sort((a, b) => counts.get(a)! - counts.get(b)!);

    let a: string | null = null;
    let b: string | null = null;

    outer: for (let x = 0; x < ordered.length; x++) {
      for (let y = 0; y < ordered.length; y++) {
        if (x === y) continue;
        const candA = ordered[x];
        const candB = ordered[y];
        if (!used.has(pairKey(candA, candB))) {
          a = candA;
          b = candB;
          break outer;
        }
      }
    }

    if (!a || !b) {
      // Fallback: all pairs used (shouldn't happen with 30 items / 40 comparisons).
      const [fa, fb] = shuffle(ids);
      a = fa;
      b = fb;
    }

    pairs.push([a, b]);
    used.add(pairKey(a, b));
    counts.set(a, counts.get(a)! + 1);
    counts.set(b, counts.get(b)! + 1);
  }

  return pairs;
}
