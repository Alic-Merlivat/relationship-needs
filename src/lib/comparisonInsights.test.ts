import { describe, expect, it } from "vitest";
import {
  classifyOverlap,
  describeRankGap,
  overlapBodyCopy,
  overlapHeadline,
  pickHighestSharedPriority,
  pluralizeCount,
  possessive,
  type SharedNeed,
} from "./comparisonInsights";

/** A minimal stand-in for the needs-catalog shape these helpers depend on. */
function need(id: string) {
  return {
    id,
    name: id,
    category: "Love & Affection" as const,
    description: "",
    subNeeds: [],
  };
}

function shared(id: string, yourRank: number, theirRank: number): SharedNeed {
  return { need: need(id), yourRank, theirRank };
}

describe("classifyOverlap", () => {
  it.each([
    [0, "low"],
    [1, "low"],
    [2, "low"],
    [3, "mixed"],
    [6, "mixed"],
    [7, "high"],
    [10, "high"],
  ] as const)("classifies %i shared needs as %s", (count, tier) => {
    expect(classifyOverlap(count)).toBe(tier);
  });
});

describe("overlapHeadline", () => {
  it("has distinct, non-empty copy for every tier", () => {
    const headlines = new Set(
      (["high", "mixed", "low"] as const).map(overlapHeadline)
    );
    expect(headlines.size).toBe(3);
    for (const h of headlines) expect(h.length).toBeGreaterThan(0);
  });
});

describe("overlapBodyCopy", () => {
  it("never claims a 'good match' or a score, regardless of tier", () => {
    for (const [count, tier] of [
      [0, "low"],
      [5, "mixed"],
      [9, "high"],
    ] as const) {
      const copy = overlapBodyCopy(count, tier, "Sam").toLowerCase();
      expect(copy).not.toContain("good match");
      expect(copy).not.toMatch(/\bscore\b/);
    }
  });

  it("does not raise incompatibility unprompted outside the low tier", () => {
    // The low tier explicitly *negates* incompatibility (tested below) —
    // it should never come up at all when there's nothing to reassure about.
    expect(overlapBodyCopy(5, "mixed", "Sam").toLowerCase()).not.toContain("incompatib");
    expect(overlapBodyCopy(9, "high", "Sam").toLowerCase()).not.toContain("incompatib");
  });

  it("states the shared count plainly for the low tier, singular-safe", () => {
    expect(overlapBodyCopy(1, "low", "Sam")).toContain("You selected 1 of the same 10 needs.");
    expect(overlapBodyCopy(0, "low", "Sam")).toContain("You selected 0 of the same 10 needs.");
  });

  it("explicitly rules out incompatibility and rejection in the low tier", () => {
    const copy = overlapBodyCopy(1, "low", "Sam");
    expect(copy).toMatch(/does not mean you are incompatible/i);
    expect(copy).toMatch(/rejected/i);
  });
});

describe("describeRankGap", () => {
  it.each([
    [5, 5, "similar level"],
    [5, 6, "similar level"],
    [3, 6, "slightly different weight"],
    [3, 5, "slightly different weight"],
  ])("gap between %i and %i reads as '%s'", (yourRank, theirRank, expectedFragment) => {
    expect(describeRankGap(yourRank, theirRank, "Sam")).toContain(expectedFragment);
  });

  it("names the partner when they are the higher-priority side", () => {
    // yourRank 8 (lower priority), theirRank 1 (higher priority) -> gap 7
    expect(describeRankGap(8, 1, "Sam")).toBe(
      "You both selected this need, but it currently carries more weight for Sam."
    );
  });

  it("says 'you' when the viewer is the higher-priority side", () => {
    expect(describeRankGap(1, 8, "Sam")).toBe(
      "You both selected this need, but it currently carries more weight for you."
    );
  });

  it("never describes an unshared need as rejected, missing, wrong, or incompatible", () => {
    for (const [a, b] of [[1, 1], [2, 5], [1, 10]]) {
      const copy = describeRankGap(a, b, "Sam").toLowerCase();
      for (const forbidden of ["rejected", "missing", "wrong", "incompatib"]) {
        expect(copy).not.toContain(forbidden);
      }
    }
  });
});

describe("pickHighestSharedPriority", () => {
  it("returns null for an empty list", () => {
    expect(pickHighestSharedPriority([])).toBeNull();
  });

  it("picks the smallest combined rank (best average)", () => {
    const list = [shared("a", 5, 5), shared("b", 1, 2), shared("c", 8, 9)];
    expect(pickHighestSharedPriority(list)!.need.id).toBe("b");
  });

  it("breaks a combined-rank tie by the smaller gap", () => {
    // "a": combined 6, gap 4. "b": combined 6, gap 0. Same average, b is closer.
    const list = [shared("a", 1, 5), shared("b", 3, 3)];
    expect(pickHighestSharedPriority(list)!.need.id).toBe("b");
  });

  it("falls back to input order when both combined rank and gap tie", () => {
    const list = [shared("first", 2, 4), shared("second", 3, 3)];
    // combined: 6 and 6; gap: 2 and 0 -> "second" wins on gap, not order.
    expect(pickHighestSharedPriority(list)!.need.id).toBe("second");

    const trueTie = [shared("first", 2, 4), shared("second", 4, 2)];
    // combined 6/6, gap 2/2 -> genuine tie, stable sort keeps input order.
    expect(pickHighestSharedPriority(trueTie)!.need.id).toBe("first");
  });

  it("does not mutate the array it was given", () => {
    const list = [shared("a", 5, 5), shared("b", 1, 2)];
    const copy = [...list];
    pickHighestSharedPriority(list);
    expect(list).toEqual(copy);
  });
});

describe("pluralizeCount", () => {
  it("uses the singular form for exactly 1", () => {
    expect(pluralizeCount(1, "shared need")).toBe("1 shared need");
  });

  it.each([0, 2, 3, 6, 7, 10])("uses the plural form for %i", (count) => {
    expect(pluralizeCount(count, "shared need")).toBe(`${count} shared needs`);
  });

  it("accepts an irregular plural", () => {
    expect(pluralizeCount(2, "child", "children")).toBe("2 children");
    expect(pluralizeCount(1, "child", "children")).toBe("1 child");
  });
});

describe("possessive", () => {
  it("adds 's for a name not ending in s", () => {
    expect(possessive("Alic")).toBe("Alic's");
    expect(possessive("Sam")).toBe("Sam's");
  });

  it("adds only an apostrophe for a name ending in s", () => {
    expect(possessive("Chris")).toBe("Chris'");
    expect(possessive("James")).toBe("James'");
  });

  it("is case-insensitive about the trailing s", () => {
    expect(possessive("ALEXIS")).toBe("ALEXIS'");
  });

  it("falls back to a neutral word for an empty name rather than crashing", () => {
    expect(possessive("")).toBe("their");
    expect(possessive("   ")).toBe("their");
  });
});
