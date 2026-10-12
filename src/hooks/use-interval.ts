import { useEffect, useRef } from "react";

type VoidFunction = () => void;

export const useInterval = (
  callback: VoidFunction,
  delay: number | null = 30000,
  dependencies: unknown[] = [],
): void => {
  const savedCallback = useRef<VoidFunction>(() => {});

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      savedCallback.current();
    };

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay, ...dependencies]);
};

export default useInterval;
