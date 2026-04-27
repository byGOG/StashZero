import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandHistory } from "./useCommandHistory";

// direction=1 → step toward older history (ArrowUp)
// direction=-1 → step toward newer / empty (ArrowDown)
function nav(result, direction) {
  let value;
  act(() => {
    value = result.current.navigate(direction);
  });
  return value;
}

describe("useCommandHistory", () => {
  it("starts empty: navigate returns null", () => {
    const { result } = renderHook(() => useCommandHistory());
    expect(result.current.navigate(1)).toBeNull();
  });

  it("ArrowUp on a single-entry history returns that entry", () => {
    const { result } = renderHook(() => useCommandHistory());
    act(() => result.current.push("ls"));
    expect(nav(result, 1)).toBe("ls");
  });

  it("deduplicates identical entries by promoting them to head", () => {
    const { result } = renderHook(() => useCommandHistory());
    act(() => {
      result.current.push("a");
      result.current.push("b");
      result.current.push("a");
    });
    // Order is now [a, b]; ArrowUp first hits "a".
    expect(nav(result, 1)).toBe("a");
    expect(nav(result, 1)).toBe("b");
  });

  it("ArrowDown past the newest entry returns empty string", () => {
    const { result } = renderHook(() => useCommandHistory());
    act(() => {
      result.current.push("a");
      result.current.push("b");
    });
    // ArrowUp twice: b, a
    expect(nav(result, 1)).toBe("b");
    expect(nav(result, 1)).toBe("a");
    // ArrowDown twice: b, ""
    expect(nav(result, -1)).toBe("b");
    expect(nav(result, -1)).toBe("");
  });

  it("clamps at the oldest entry on repeated ArrowUp", () => {
    const { result } = renderHook(() => useCommandHistory());
    act(() => {
      result.current.push("a");
      result.current.push("b");
    });
    expect(nav(result, 1)).toBe("b");
    expect(nav(result, 1)).toBe("a");
    // Already at oldest — clamped, stays "a".
    expect(nav(result, 1)).toBe("a");
  });

  it("caps history at 50 entries", () => {
    const { result } = renderHook(() => useCommandHistory());
    act(() => {
      for (let i = 0; i < 60; i++) result.current.push(`cmd-${i}`);
    });
    // Newest is cmd-59 at index 0, oldest retained is cmd-10 at index 49.
    let last = null;
    for (let i = 0; i < 50; i++) last = nav(result, 1);
    expect(last).toBe("cmd-10");
    // 51st ArrowUp clamps at oldest.
    expect(nav(result, 1)).toBe("cmd-10");
  });

  it("push resets navigation index", () => {
    const { result } = renderHook(() => useCommandHistory());
    act(() => {
      result.current.push("a");
      result.current.push("b");
    });
    nav(result, 1); // walked to "b"
    act(() => result.current.push("c"));
    // After push, ArrowUp again should start from newest "c".
    expect(nav(result, 1)).toBe("c");
  });
});
