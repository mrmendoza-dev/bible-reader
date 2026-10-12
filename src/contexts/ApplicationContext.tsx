import { createContext, type ReactNode, useContext } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface ApplicationContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
}

const ApplicationContext = createContext<ApplicationContextType | null>(null);

export const useApplicationContext = () => {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error(
      "useApplicationContext must be used within an ApplicationProvider",
    );
  }
  return context;
};

export const ApplicationProvider = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useLocalStorage("sidebarOpen", false);

  const value = {
    sidebarOpen,
    setSidebarOpen,
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
};
