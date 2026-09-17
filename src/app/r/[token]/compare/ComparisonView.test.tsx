import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NEEDS } from "@/data/needs";
import type { ComparisonRecord } from "@/lib/bradleyTerry";
import { ComparisonView } from "./ComparisonView";

afterEach(cleanup);

const ALL_IDS = NEEDS.map((n) => n.id);

/**
 * A full round-robin where each need beats every need listed after it.
 * Bradley-Terry recovers this as a perfect strict ranking (rank = index+1),
 * with no noise to make the resulting order ambiguous in a test.
 */
function strictHistory(ids: string[]): ComparisonRecord[] {
  const history: ComparisonRecord[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      history.push({ winnerId: ids[i], loserId: ids[j] });
    }
  }
  return history;
}

function selection(count: number, offset = 0): string[] {
  return ALL_IDS.slice(offset, offset + count);
}

describe("ComparisonView — unique-needs expand/collapse", () => {
  it("shows only 3 unique needs per side initially, expands to all on click", () => {
    // 10 fully unique needs each side (no overlap): plenty to expand.
    const yourIds = selection(10, 0);
    const theirIds = selection(10, 10);

    render(
      <ComparisonView
        token="t"
        you={{ name: "You", history: strictHistory(yourIds), selectedIds: yourIds }}
        them={{ name: "Sam", history: strictHistory(theirIds), selectedIds: theirIds }}
      />
    );

    const toggle = screen.getByRole("button", { name: /see all our needs/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    // Scoped to the unique-priorities section specifically — the page also
    // has an unrelated <ol> of 4 steps in the next-step card, which is a
    // list of "listitem"s too and must not be counted here.
    const section = screen
      .getByText(/what each of you most wants understood/i)
      .closest("section")!;
    expect(within(section).getAllByRole("listitem")).toHaveLength(6);

    fireEvent.click(toggle);

    const expandedToggle = screen.getByRole("button", { name: /show fewer needs/i });
    expect(expandedToggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(section).getAllByRole("listitem")).toHaveLength(20);
  });

  it("hides the toggle entirely when neither side has more than 3 unique needs", () => {
    const yourIds = selection(2, 0);
    const theirIds = selection(2, 2);

    render(
      <ComparisonView
        token="t"
        you={{ name: "You", history: strictHistory(yourIds), selectedIds: yourIds }}
        them={{ name: "Sam", history: strictHistory(theirIds), selectedIds: theirIds }}
      />
    );

    expect(screen.queryByRole("button", { name: /see all our needs/i })).toBeNull();
  });
});

describe("ComparisonView — shared-need counts", () => {
  it("renders the zero-shared empty state and skips the highest-shared-priority card", () => {
    const yourIds = selection(10, 0);
    const theirIds = selection(10, 10);

    render(
      <ComparisonView
        token="t"
        you={{ name: "You", history: strictHistory(yourIds), selectedIds: yourIds }}
        them={{ name: "Sam", history: strictHistory(theirIds), selectedIds: theirIds }}
      />
    );

    expect(screen.getByText(/none of your selected top 10 needs are the same/i)).toBeTruthy();
    expect(screen.queryByText(/your highest shared priority/i)).toBeNull();
    // The empty state explicitly reassures rather than warns — "is not a
    // sign that the relationship cannot work" is the intended (negated)
    // phrasing, so what must be absent is an *unqualified* doom claim.
    expect(screen.queryByText(/^this means the relationship cannot work/i)).toBeNull();
  });

  it("shows the singular count for exactly one shared need", () => {
    const shared = [ALL_IDS[0]];
    const yourIds = [...shared, ...selection(9, 20)];
    const theirIds = [...shared, ...selection(9, 30)];

    render(
      <ComparisonView
        token="t"
        you={{ name: "You", history: strictHistory(yourIds), selectedIds: yourIds }}
        them={{ name: "Sam", history: strictHistory(theirIds), selectedIds: theirIds }}
      />
    );

    expect(screen.getByText("1 shared need")).toBeTruthy();
  });

  it("shows the highest-shared-priority card when both selections are identical", () => {
    const ids = selection(10, 0);

    render(
      <ComparisonView
        token="t"
        you={{ name: "You", history: strictHistory(ids), selectedIds: ids }}
        them={{ name: "Sam", history: strictHistory(ids), selectedIds: ids }}
      />
    );

    expect(screen.getByText("10 shared needs")).toBeTruthy();
    expect(screen.getByText(/your highest shared priority/i)).toBeTruthy();
  });
});

describe("ComparisonView — names", () => {
  it("renders a long partner name without crashing, and applies the possessive helper", () => {
    const ids = selection(10, 0);
    const longName = "Bartholomew-Christopherson";

    render(
      <ComparisonView
        token="t"
        you={{ name: "You", history: strictHistory(ids), selectedIds: ids }}
        them={{ name: longName, history: strictHistory(ids), selectedIds: ids }}
      />
    );

    expect(screen.getByText(`${longName}'s priorities`)).toBeTruthy();
  });

  it("uses the apostrophe-only possessive for a name ending in s", () => {
    const yourIds = selection(10, 0);
    const theirIds = selection(10, 10);

    render(
      <ComparisonView
        token="t"
        you={{ name: "You", history: strictHistory(yourIds), selectedIds: yourIds }}
        them={{ name: "Chris", history: strictHistory(theirIds), selectedIds: theirIds }}
      />
    );

    expect(screen.getByText("Chris' priorities")).toBeTruthy();
  });
});
