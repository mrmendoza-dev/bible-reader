import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "@/hooks/useLocalStorage";

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("local preferences", () => {
  it("synchronizes hook instances and consecutive functional writes", () => {
    const first = renderHook(() => useLocalStorage("test:count", 0));
    const second = renderHook(() => useLocalStorage("test:count", 0));
    act(() => {
      first.result.current[1]((value) => value + 1);
      first.result.current[1]((value) => value + 1);
    });
    expect(first.result.current[0]).toBe(2);
    expect(second.result.current[0]).toBe(2);
    expect(JSON.parse(localStorage.getItem("test:count") ?? "null")).toEqual({
      value: 2,
    });
  });
  it("falls back for corrupt JSON, expired values and invalid wrapped preferences", () => {
    localStorage.setItem("test:bad", "{");
    expect(
      renderHook(() => useLocalStorage("test:bad", "default")).result
        .current[0],
    ).toBe("default");
    localStorage.setItem(
      "test:expired",
      JSON.stringify({ value: "old", expiry: Date.now() - 1 }),
    );
    expect(
      renderHook(() => useLocalStorage("test:expired", "default")).result
        .current[0],
    ).toBe("default");
    localStorage.setItem("test:validated", JSON.stringify({ value: "all" }));
    expect(
      renderHook(() =>
        useLocalStorage(
          "test:validated",
          "web",
          undefined,
          (value) => value === "web",
        ),
      ).result.current[0],
    ).toBe("web");
  });
  it("reacts to another tab's storage event and key changes", () => {
    const hook = renderHook(({ key }) => useLocalStorage(key, 0), {
      initialProps: { key: "test:first" },
    });
    act(() => {
      localStorage.setItem("test:first", JSON.stringify({ value: 7 }));
      window.dispatchEvent(new StorageEvent("storage", { key: "test:first" }));
    });
    expect(hook.result.current[0]).toBe(7);
    localStorage.setItem("test:second", JSON.stringify({ value: 9 }));
    hook.rerender({ key: "test:second" });
    expect(hook.result.current[0]).toBe(9);
  });
  it("keeps a preference usable in memory when persistence fails", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    const hook = renderHook(() => useLocalStorage("test:blocked", "web"));
    act(() => hook.result.current[1]("asv"));
    expect(hook.result.current[0]).toBe("asv");
    expect(error).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
