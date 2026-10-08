import { describe, it, expect } from "vitest";
import { getOverallProgress, isLocalNarrative, Narrative } from "./archiveService";

const narrative = (overrides: Partial<Narrative>): Narrative => ({
  id: "1",
  title: "Book",
  content: "",
  progressIndex: 0,
  totalWords: 100,
  type: "epub",
  dateAdded: 0,
  ...overrides,
});

describe("getOverallProgress", () => {
  it("counts the words of finished chapters", () => {
    const n = narrative({ chapterWordCounts: [40, 60], chapterIndex: 1, progressIndex: 10 });
    expect(getOverallProgress(n)).toBeCloseTo(50);
  });

  it("handles books saved before chapter counts existed", () => {
    expect(getOverallProgress(narrative({ progressIndex: 25 }))).toBeCloseTo(25);
    expect(getOverallProgress(narrative({ totalWords: undefined as unknown as number }))).toBe(0);
  });

  it("never exceeds 100%", () => {
    expect(getOverallProgress(narrative({ progressIndex: 500 }))).toBe(100);
  });
});

describe("isLocalNarrative", () => {
  it("treats only TXT narratives as local", () => {
    expect(isLocalNarrative({ type: "txt" })).toBe(true);
    expect(isLocalNarrative({ type: "epub" })).toBe(false);
    expect(isLocalNarrative({ type: "pdf" })).toBe(false);
  });
});
