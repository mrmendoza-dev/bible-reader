import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Renders only in development — triggers error UIs for manual QA. */
export const DevErrorTriggers = () => {
  const [crashBoundary, setCrashBoundary] = useState(false);

  if (crashBoundary) {
    throw new Error(
      "Dev-only: intentional crash to test ErrorBoundary → ErrorGeneric.",
    );
  }

  return (
    <section
      className="rounded-lg border border-dashed border-orange-500/35 bg-orange-500/5 px-4 py-3 text-sm"
      aria-label="Development error UI tests"
    >
      <p className="font-medium text-foreground">
        Development — test error screens
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        ErrorBoundary (this layout) vs route{" "}
        <code className="text-foreground">errorElement</code> (
        <Link
          to="/dev/error-boom"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          /dev/error-boom
        </Link>
        ).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCrashBoundary(true)}
        >
          Trigger ErrorBoundary
        </Button>
        <Link
          to="/dev/error-boom"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Route error page
        </Link>
      </div>
    </section>
  );
};
