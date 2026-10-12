import { useEffect, useRef } from "react";

const useFocus = () => {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  return ref;
};

export default useFocus;
