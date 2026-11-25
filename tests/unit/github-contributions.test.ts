import { describe, expect, test } from "bun:test";
import { parseContributions } from "@/lib/github-contributions";

const cell = (date: string, level: number) =>
  `<td tabindex="0" data-date="${date}" id="d-${date}" data-level="${level}" role="gridcell" class="ContributionCalendar-day"></td>`;

describe("parseContributions", () => {
  test("orders days by date, starts on a Sunday and sums the shown days", () => {
    // 2025-11-22 is a Saturday, so it is dropped; 2025-11-23 is a Sunday.
    const dates = [
      "2025-11-24",
      "2025-11-23",
      "2025-11-22",
      "2025-11-25",
      "2025-11-26",
      "2025-11-27",
      "2025-11-28",
      "2025-11-29",
    ];
    const html =
      dates.map((date, index) => cell(date, index % 5)).join("") +
      `<tool-tip for="d-2025-11-24">2 contributions on November 24th.</tool-tip><tool-tip for="d-2025-11-25">1,001 contributions on November 25th.</tool-tip><tool-tip for="d-2025-11-23">No contributions on November 23rd.</tool-tip><tool-tip for="d-2025-11-22">5 contributions on November 22nd.</tool-tip>`;
    const now = new Date("2025-11-30T00:00:00Z");
    // The Saturday before the first Sunday is not drawn, so its 5 don't count.
    expect(parseContributions(html, now)).toEqual({
      total: 1003,
      levels: "1034012",
      fetchedAt: now.toISOString(),
    });
  });

  test("returns null when the markup has no calendar", () => {
    expect(parseContributions("<html><body>Not Found</body></html>")).toBeNull();
  });
});
