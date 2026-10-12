import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { Providers } from "@/contexts/Providers";
import { router } from "@/Router";

export const App = () => {
  return (
    <ErrorBoundary label="Root ErrorBoundary">
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </ErrorBoundary>
  );
};
