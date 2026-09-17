import type { RelationshipNeed } from "@/data/needs";

/** One need both partners selected, with each person's rank for it. */
export interface SharedNeed {
  need: RelationshipNeed;
  yourRank: number;
  theirRank: number;
}

/** How much overlap a couple's two selections have. */
export type OverlapTier = "high" | "mixed" | "low";

/**
 * Buckets a shared-need count into one of three interpretive tiers.
 *
 * The thresholds (7 and 3) are fixed, small, and meaningful only relative to
 * a 10-need selection — not derived from anything statistical, unlike the
 * Bradley-Terry confidence tiers elsewhere in the app.
 */
export function classifyOverlap(sharedCount: number): OverlapTier {
  if (sharedCount >= 7) return "high";
  if (sharedCount >= 3) return "mixed";
  return "low";
}

export function overlapHeadline(tier: OverlapTier): string {
  switch (tier) {
    case "high":
      return "You have a lot of common ground";
    case "mixed":
      return "You share some priorities and bring different needs";
    case "low":
      return "Your strongest priorities are mostly different";
  }
}

/**
 * The body copy under the relationship-pattern heading.
 *
 * Every tier states the shared count plainly, then interprets it — the
 * `low` tier explicitly rules out the two misreadings (incompatibility,
 * rejection) this whole page exists to avoid encouraging.
 */
export function overlapBodyCopy(
  sharedCount: number,
  tier: OverlapTier,
  partnerName: string
): string {
  const base = `You selected ${sharedCount} of the same 10 needs.`;
  switch (tier) {
    case "high":
      return `${base} That's a strong overlap — many of the things that matter most to you also matter most to ${partnerName}.`;
    case "mixed":
      return `${base} The rest reflect different priorities, which is a healthy mix — plenty to build on, and plenty still worth exploring together.`;
    case "low":
      return `${base} This does not mean you are incompatible or that either partner rejected the other's needs. It means different parts of the relationship currently matter most to each of you.`;
  }
}

/**
 * Interprets one shared need's rank gap between the two partners.
 *
 * Below rank 2 the gap is noise, not signal — the ranking's own tested
 * accuracy at this scale (see scripts/simulate-selected.ts) means small
 * differences shouldn't be read as meaningful. `partnerName` is used only
 * when the partner is the higher-priority side; the viewer's own side reads
 * as "you", which is both more natural and avoids assuming the viewer knows
 * their own name is relevant here.
 */
export function describeRankGap(
  yourRank: number,
  theirRank: number,
  partnerName: string
): string {
  const gap = Math.abs(yourRank - theirRank);
  if (gap <= 1) {
    return "This need appears at a similar level in both of your results.";
  }
  if (gap <= 3) {
    return "You both selected this need, although it carries slightly different weight for each of you.";
  }
  const higherPriority = yourRank < theirRank ? "you" : partnerName;
  return `You both selected this need, but it currently carries more weight for ${higherPriority}.`;
}

/**
 * Picks the couple's single highest shared priority.
 *
 * Ordered by combined rank (equivalent to average rank, without the
 * division), then by the smaller rank gap, then by whatever order the
 * input arrived in — a stable sort, so this only needs to add the two
 * explicit tie-breaks on top of it.
 */
export function pickHighestSharedPriority(shared: SharedNeed[]): SharedNeed | null {
  if (shared.length === 0) return null;
  return [...shared].sort((a, b) => {
    const combinedA = a.yourRank + a.theirRank;
    const combinedB = b.yourRank + b.theirRank;
    if (combinedA !== combinedB) return combinedA - combinedB;
    const gapA = Math.abs(a.yourRank - a.theirRank);
    const gapB = Math.abs(b.yourRank - b.theirRank);
    return gapA - gapB;
  })[0];
}

/** `pluralizeCount(1, "shared need")` → "1 shared need"; `pluralizeCount(7, "shared need")` → "7 shared needs". */
export function pluralizeCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * A grammatically safe possessive for a name that might end in "s"
 * ("Chris" → "Chris'", not "Chris's" — the more common convention for a
 * name already ending in the sound, and the one that reads least oddly in
 * a short UI label). Falls back to a neutral word if the name is empty,
 * which should not happen in practice but must not crash the page if it did.
 */
export function possessive(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "their";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}
