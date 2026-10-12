// import * as Sentry from "@sentry/react";
import type { FC, ReactNode } from "react";
import { ErrorBoundary as LibErrorBoundary } from "react-error-boundary";
import { ErrorGeneric } from "@/components/feedback/ErrorGeneric";

type ErrorBoundaryProps = {
  children: ReactNode;
  label?: string;
};

export const ErrorBoundary: FC<ErrorBoundaryProps> = ({ children, label }) => {
  return (
    <LibErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <ErrorGeneric onRetry={resetErrorBoundary} />
      )}
      onError={(_error, _info) => {
        console.info(label);

        // Sentry.captureException(_error, {
        //   extra: {
        //     componentStack: _info.componentStack,
        //     message: _error.message,
        //     name: _error.name,
        //     stack: _error.stack,
        //     url: window.location.href,
        //   },
        // });
      }}
    >
      {children}
    </LibErrorBoundary>
  );
};
