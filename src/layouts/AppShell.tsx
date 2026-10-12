import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useApplicationContext } from "@/contexts/ApplicationContext";
import { cn } from "@/lib/utils";

const ShellLayout = () => {
  return (
    <div className="min-h-dvh h-[100dvh] w-[100dvw] flex flex-col">
      <Navbar className="flex-shrink-0 bg-background border-b backdrop-blur-sm z-50 px-4 py-2" />

      <div className="flex-1 flex flex-row min-h-0">
        <AppSidebar className="flex-shrink-0" />

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "h-full w-full relative",
            "flex-1 overflow-auto bg-background p-4",
          )}
        >
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export const AppShell = () => {
  const { sidebarOpen, setSidebarOpen } = useApplicationContext();

  return (
    <div className="h-full w-full overflow-hidden">
      <ErrorBoundary label="AppShell ErrorBoundary">
        <SidebarProvider
          className="w-full"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          style={
            {
              "--sidebar-width": "10rem",
            } as CSSProperties
          }
        >
          <ShellLayout />
        </SidebarProvider>
      </ErrorBoundary>
      <Toaster
        className="Toaster-style"
        position="top-right"
        offset={{
          top: 120,
          right: 20,
        }}
      />
    </div>
  );
};
