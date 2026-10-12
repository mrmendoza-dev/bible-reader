import { Pipette } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useEyeDropper } from "@/hooks/use-eye-dropper";
import { cn } from "@/lib/utils";

export interface EyedropperProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "onError"
  > {
  onColorSelect?: (color: string) => void;
  onError?: (error: string) => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const Eyedropper = React.forwardRef<HTMLButtonElement, EyedropperProps>(
  (
    {
      className,
      variant = "outline",
      size = "sm",
      onColorSelect,
      onError,
      disabled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const { openEyeDropper } = useEyeDropper();

    const handleClick = React.useCallback(async () => {
      try {
        const color = await openEyeDropper();
        if (color && onColorSelect) {
          onColorSelect(color);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to pick color";
        if (onError) {
          onError(errorMessage);
        }
      }
    }, [openEyeDropper, onColorSelect, onError]);

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled}
        className={cn("", className)}
        title="Pick color from screen"
        {...props}
      >
        {children || <Pipette className="size-4" />}
      </Button>
    );
  },
);

Eyedropper.displayName = "Eyedropper";

export { Eyedropper };
