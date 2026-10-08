import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAeroEngine } from "./useAeroEngine";
import { processText } from "@/lib/textProcessor";

// Five plain words: each has a delay modifier of exactly 1
const WORDS = processText("aaa bbb ccc ddd eee");
// 600 WPM -> 100ms per word
const WPM = 600;

describe("useAeroEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances one word per base delay and reports the final index", () => {
    const onChapterComplete = vi.fn();
    const { result } = renderHook(() => useAeroEngine({ words: WORDS, wpm: WPM, onChapterComplete }));

    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.currentIndex).toBe(2);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.isPlaying).toBe(false);
    expect(onChapterComplete).toHaveBeenCalledWith(WORDS.length - 1);
  });

  it("steps back five words on pause", () => {
    const words = processText(Array(20).fill("aaa").join(" "));
    const { result } = renderHook(() => useAeroEngine({ words, wpm: WPM, initialIndex: 12 }));
    act(() => result.current.play());
    act(() => result.current.pause());
    expect(result.current.currentIndex).toBe(7);
  });

  it("restarts from initialIndex when the words change", () => {
    const { result, rerender } = renderHook(
      ({ words, initialIndex }) => useAeroEngine({ words, wpm: WPM, initialIndex }),
      { initialProps: { words: WORDS, initialIndex: 3 } },
    );
    expect(result.current.currentIndex).toBe(3);

    rerender({ words: processText("next chapter words here"), initialIndex: 0 });
    expect(result.current.currentIndex).toBe(0);
  });

  it("clamps setIndex to the word list", () => {
    const { result } = renderHook(() => useAeroEngine({ words: WORDS, wpm: WPM }));
    act(() => result.current.setIndex(99));
    expect(result.current.currentIndex).toBe(WORDS.length - 1);
    act(() => result.current.setIndex(-5));
    expect(result.current.currentIndex).toBe(0);
  });
});
