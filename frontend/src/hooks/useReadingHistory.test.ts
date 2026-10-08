import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReadingHistory } from "./useReadingHistory";

describe("useReadingHistory", () => {
  beforeEach(() => localStorage.clear());

  it("keeps endSession stable across progress updates", () => {
    const { result } = renderHook(() => useReadingHistory());
    const endSession = result.current.endSession;
    act(() => {
      result.current.startSession("some text", 100, 300);
      result.current.updateProgress(10, 300);
    });
    expect(result.current.endSession).toBe(endSession);
  });

  it("saves the session to storage even when ended during unmount", () => {
    const { result, unmount } = renderHook(() => useReadingHistory());
    act(() => {
      result.current.startSession("some text", 100, 300);
      result.current.updateProgress(40, 350);
    });
    const endSession = result.current.endSession;
    unmount();
    endSession();

    const stored = JSON.parse(localStorage.getItem("aeroread_history") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ progress: 40, wpm: 350, wordCount: 100 });
  });

  it("skips sessions where nothing was read", () => {
    const { result } = renderHook(() => useReadingHistory());
    act(() => {
      result.current.startSession("some text", 100, 300);
      result.current.endSession();
    });
    expect(localStorage.getItem("aeroread_history")).toBeNull();
  });
});
