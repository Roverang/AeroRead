import { describe, it, expect } from "vitest";
import { processText } from "./textProcessor";

const modifierOf = (word: string) => processText(word)[0].delayModifier;

describe("processText", () => {
  it("splits on any whitespace and drops empty strings", () => {
    expect(processText("  one\ttwo\n\nthree  ").map(w => w.word)).toEqual(["one", "two", "three"]);
    expect(processText("")).toEqual([]);
  });

  it("splits each word around its recognition point", () => {
    const [w] = processText("reading");
    expect(w.pivotIndex).toBe(2);
    expect(w.prefix + w.pivotChar + w.suffix).toBe("reading");
    expect(w.pivotChar).toBe("a");
  });

  it("pauses longer at sentence and clause ends", () => {
    expect(modifierOf("end.")).toBeCloseTo(2.2);
    expect(modifierOf("then,")).toBeCloseTo(1.5);
    expect(modifierOf("word")).toBe(1);
  });

  it("speeds through short words", () => {
    expect(modifierOf("of")).toBeCloseTo(0.75);
  });

  it("gives very long words more time than long words", () => {
    expect(modifierOf("extraordinary")).toBeCloseTo(1.35); // 13 letters
    expect(modifierOf("incomprehensibility")).toBeCloseTo(1.6); // 19 letters
  });

  it("slows down for numbers and all-caps words", () => {
    expect(modifierOf("1999")).toBeCloseTo(1.5 * 1.2); // digits are also "all caps"
    expect(modifierOf("STOP")).toBeCloseTo(1.2);
  });
});
