import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { ErrorScreenShell } from "@/components/feedback/ErrorScreenShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const RouteErrorPage = () => {
  const error = useRouteError();

  let title = "Something went wrong";
  let detail: string | null = null;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    detail =
      typeof error.data === "string"
        ? error.data
        : error.data != null
          ? JSON.stringify(error.data)
          : null;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <ErrorScreenShell>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm"
        role="alert"
      >
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {detail ? (
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            {detail}
          </p>
        ) : null}
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "mt-6 inline-flex",
          )}
        >
          Back to home
        </Link>
      </div>
    </ErrorScreenShell>
  );
};
