import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useApplicationContext } from "@/contexts/ApplicationContext";
import { cn } from "@/lib/utils";

export const Navbar = ({ className }: { className?: string }) => {
  const { sidebarOpen, setSidebarOpen } = useApplicationContext();

  return (
    <nav className={cn("", className)}>
      <div className="flex justify-between h-full items-center gap-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger
            className="text-foreground p-4"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          />
          <Link
            to="/"
            className="flex items-center justify-between gap-2 logo-test"
          >
            <img src="/images/logo.png" className="h-8" alt="Bible Reader logo" />
            <span className="self-center text-base sm:text-lg font-semibold whitespace-nowrap dark:text-white text-black">
              Bible Reader
            </span>
          </Link>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
