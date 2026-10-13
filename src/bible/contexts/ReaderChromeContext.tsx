import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ReaderChromeSnapshot = {
  bookmarkCount: number;
  openBookmarks: () => void;
};

type ReaderChromeContextValue = {
  snapshot: ReaderChromeSnapshot | null;
  setReaderChrome: (snapshot: ReaderChromeSnapshot | null) => void;
};

const ReaderChromeContext = createContext<ReaderChromeContextValue | null>(
  null,
);

export const ReaderChromeProvider = ({ children }: { children: ReactNode }) => {
  const [snapshot, setSnapshot] = useState<ReaderChromeSnapshot | null>(null);

  const setReaderChrome = useCallback((next: ReaderChromeSnapshot | null) => {
    setSnapshot(next);
  }, []);

  const value = useMemo(
    () => ({ snapshot, setReaderChrome }),
    [snapshot, setReaderChrome],
  );

  return (
    <ReaderChromeContext.Provider value={value}>
      {children}
    </ReaderChromeContext.Provider>
  );
};

export const useReaderChrome = () => {
  const ctx = useContext(ReaderChromeContext);
  if (!ctx) {
    throw new Error("useReaderChrome must be used within ReaderChromeProvider");
  }
  return ctx;
};

export const useOptionalReaderChrome = () =>
  useContext(ReaderChromeContext)?.snapshot ?? null;
