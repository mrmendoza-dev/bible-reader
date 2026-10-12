import { render, screen, waitFor } from "@testing-library/react";
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
          data: [
            { id: 1, label: "demo" },
            { id: 2, label: "vitest" },
          ],
          error: null,
        }),
      },
    },
  },
}));

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
};

describe("app routes", () => {
  it("renders home at /", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(screen.getByTestId("api-health-status")).toBeInTheDocument();
    });
  });

  it("renders main landmark with a11y attributes", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(screen.getByTestId("api-health-status")).toBeInTheDocument();
    });
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabIndex", "-1");
  });

  it("renders chat at /chat (lazy route)", async () => {
    renderAt("/chat");
    await waitFor(() => {
      expect(screen.getByTestId("chat-page")).toBeInTheDocument();
    });
  });

  it("renders detail at /detail/:id (lazy route)", async () => {
    renderAt("/detail/demo-id");
    await waitFor(() => {
      expect(screen.getByTestId("detail-page")).toBeInTheDocument();
    });
    expect(screen.getByText("demo-id")).toBeInTheDocument();
  });

  it("renders profile at /profile (lazy route)", async () => {
    renderAt("/profile");
    await waitFor(() => {
      expect(screen.getByTestId("profile-page")).toBeInTheDocument();
    });
  });
});
