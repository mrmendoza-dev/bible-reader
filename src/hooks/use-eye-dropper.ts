import { useCallback, useState } from "react";

type EyeDropperApi = {
  open: () => Promise<{ sRGBHex: string }>;
};

type WindowWithEyeDropper = Window & {
  EyeDropper?: new () => EyeDropperApi;
};

export const useEyeDropper = () => {
  const [color, setColor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openEyeDropper = useCallback(async () => {
    const EyeDropper = (window as WindowWithEyeDropper).EyeDropper;
    if (!EyeDropper) {
      setError("EyeDropper API not supported in this browser.");
      return null;
    }

    try {
      const result = await new EyeDropper().open();
      setColor(result.sRGBHex);
      setError(null);
      return result.sRGBHex;
    } catch {
      setError("Color picking was canceled or failed.");
      return null;
    }
  }, []);

  return { color, error, openEyeDropper };
};
