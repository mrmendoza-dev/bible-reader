import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { useBibleContext } from "@/bible/contexts/BibleContext";
import { BibleProvider } from "@/bible/contexts/BibleProvider";
import { READING_FONTS } from "@/bible/reading-fonts";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it.each(READING_FONTS)("restores the saved $label reading font", ({
  value,
}) => {
  localStorage.setItem("bible:font-style", JSON.stringify({ value }));
  const { result } = renderHook(useBibleContext, { wrapper: BibleProvider });
  expect(result.current.fontStyle).toBe(value);
});

it.each([
  "unknown",
  "constructor",
  null,
  7,
])("rejects unsupported saved font %s", (value) => {
  localStorage.setItem("bible:font-style", JSON.stringify({ value }));
  const { result } = renderHook(useBibleContext, { wrapper: BibleProvider });
  expect(result.current.fontStyle).toBe("sans");
  expect(localStorage.getItem("bible:font-style")).toBeNull();
});
