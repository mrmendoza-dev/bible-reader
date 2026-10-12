import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/contexts/Providers";
import { appRoutes } from "@/Router";

vi.mock("@/lib/api-client", () => ({
  hasExplicitApiOrigin: true,
  api: {
    api: {
      health: {
        get: async () => ({ data: { status: "ok" as const }, error: null }),
      },
      examples: {
        get: async () => ({
          data: [{ id: 1, label: "demo" }],
          error: null,
        }),
      },
    },
  },
}));

describe("AppShell", () => {
  it("renders navigation, main, and sidebar toggle", () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /toggle sidebar/i }),
    ).toBeInTheDocument();
  });
});
