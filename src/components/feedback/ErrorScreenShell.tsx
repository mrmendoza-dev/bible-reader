import type { ReactNode } from "react";

type ErrorScreenShellProps = { children: ReactNode };

/** Full-viewport centered backdrop for error states (theme tokens). */
export const ErrorScreenShell = ({ children }: ErrorScreenShellProps) => {
  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 py-12"
      role="presentation"
    >
      {children}
    </div>
  );
};
