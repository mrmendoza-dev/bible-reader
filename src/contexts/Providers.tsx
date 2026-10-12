import { QueryClientProvider } from "@tanstack/react-query";
import { ApplicationProvider } from "@/contexts/ApplicationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { queryClient } from "@/lib/query-client";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ApplicationProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ApplicationProvider>
  </QueryClientProvider>
);
