import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/contexts/Providers";
import { HomePage } from "@/pages/HomePage";

vi.mock("@/lib/api-client", () => ({
  hasExplicitApiOrigin: true,
  api: {
    api: {
      health: {
        get: async () => ({ data: { status: "ok" as const }, error: null }),
      },
      examples: {
        get: async () => ({ data: [], error: null }),
      },
    },
  },
}));

describe("HomePage", () => {
  it("surfaces API health via TanStack Query", async () => {
    render(
      <BrowserRouter>
        <Providers>
          <HomePage />
        </Providers>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("api-health-status")).toHaveTextContent(
        "API: ok",
      );
    });
  });
});
