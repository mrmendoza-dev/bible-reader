import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { HomePage } from "@/pages/HomePage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";

const devOnlyRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: "dev/error-boom",
        lazy: async () => {
          const { DevErrorBoom } = await import("@/pages/DevErrorBoom");
          return { Component: DevErrorBoom };
        },
      },
    ]
  : [];

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      ...devOnlyRoutes,
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "chat",
        lazy: async () => {
          const { ChatPage } = await import("@/pages/ChatPage");
          return { Component: ChatPage };
        },
      },
      {
        path: "detail/:id",
        lazy: async () => {
          const { DetailPage } = await import("@/pages/DetailPage");
          return { Component: DetailPage };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const { ProfilePage } = await import("@/pages/ProfilePage");
          return { Component: ProfilePage };
        },
      },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
