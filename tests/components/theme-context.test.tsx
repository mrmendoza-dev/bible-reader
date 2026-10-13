import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function ThemeControls() {
  const { theme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme("light")}>
      {theme}
    </button>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("restores a valid stored theme", () => {
    localStorage.setItem("bible-reader-theme", "light");
    render(
      <ThemeProvider>
        <ThemeControls />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(document.documentElement).toHaveClass("light");
  });

  it("falls back to the default for an invalid stored theme", () => {
    localStorage.setItem("bible-reader-theme", "invalid theme");
    render(
      <ThemeProvider>
        <ThemeControls />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("renders when storage reads are blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    render(
      <ThemeProvider>
        <ThemeControls />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveClass("dark");
  });

  it("changes theme even when storage writes fail", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ThemeProvider>
        <ThemeControls />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(document.documentElement).toHaveClass("light");
  });
});
