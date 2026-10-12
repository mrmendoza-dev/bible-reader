import { useQuery } from "@tanstack/react-query";
import { DevErrorTriggers } from "@/components/dev/DevErrorTriggers";
import { api, hasExplicitApiOrigin } from "@/lib/api-client";

const pollEvery5sUnlessError = (query: {
  state: { status: string };
}): number | false => (query.state.status === "error" ? false : 5_000);

const moduleIds = ["01", "02", "03", "04", "05", "06"];
const scrollParagraphKeys = ["intro", "body", "tail"];

export const HomePage = () => {
  const showStaticDeployHint = import.meta.env.PROD && !hasExplicitApiOrigin;

  const health = useQuery({
    queryKey: ["api", "health"],
    queryFn: async () => {
      const { data, error } = await api.api.health.get();
      if (error) {
        throw new Error("API health check failed");
      }
      return data;
    },
    refetchInterval: pollEvery5sUnlessError,
  });

  const examples = useQuery({
    queryKey: ["api", "examples"],
    queryFn: async () => {
      const { data, error } = await api.api.examples.get();
      if (error) {
        throw new Error("Failed to load examples");
      }
      if (data == null) {
        return [];
      }
      if (!Array.isArray(data)) {
        throw new Error(
          "Examples API returned a non-array response. For static hosting, set VITE_API_URL to your Bun API origin, or deploy the server so GET /api/examples returns a JSON array.",
        );
      }
      return data;
    },
    refetchInterval: pollEvery5sUnlessError,
  });

  const exampleRows = Array.isArray(examples.data) ? examples.data : [];

  return (
    <div className="space-y-8 p-4">
      <header className="border-b pb-4">
        <h1 className="text-4xl font-extrabold tracking-tighter">
          Bible Reader
        </h1>
        <p className="text-muted-foreground">
          Read, search, bookmark, and study scripture — React 19, offline-ready
          PWA.
        </p>
      </header>

      {import.meta.env.DEV ? <DevErrorTriggers /> : null}

      <section
        className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4"
        aria-labelledby="server-heading"
      >
        <h2 id="server-heading" className="text-xl font-semibold">
          Server (Elysia + Drizzle)
        </h2>
        <p className="text-sm text-muted-foreground">
          Live data from{" "}
          <code className="text-foreground">GET /api/health</code> and{" "}
          <code className="text-foreground">GET /api/examples</code>. Refreshes
          every 5s while healthy. Run the Bun server and ensure{" "}
          <code className="text-foreground">SERVER_PORT</code> matches your env
          (or set <code className="text-foreground">VITE_API_URL</code>).
        </p>

        {showStaticDeployHint ? (
          <p
            className="text-sm rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-muted-foreground"
            role="note"
          >
            This production build has no{" "}
            <code className="text-foreground">VITE_API_URL</code>. The app calls
            same-origin <code className="text-foreground">/api/*</code> (fine if
            your host proxies to Bun). Pure static hosts usually need{" "}
            <code className="text-foreground">VITE_API_URL</code> set at{" "}
            <strong className="font-medium text-foreground">build</strong> time.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Health
            </h3>
            <p className="text-sm font-mono" data-testid="api-health-status">
              API:{" "}
              {health.isPending
                ? "…"
                : health.isError
                  ? showStaticDeployHint
                    ? "unreachable (check /api or VITE_API_URL)"
                    : "unreachable"
                  : (health.data?.status ?? "—")}
            </p>
          </div>

          <div className="rounded-lg border bg-background p-4 sm:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Examples table
            </h3>
            {examples.isPending ? (
              <p className="text-sm text-muted-foreground">Loading rows…</p>
            ) : examples.isError ? (
              <p className="text-sm text-muted-foreground">
                Could not load examples.{" "}
                {showStaticDeployHint ? (
                  <>
                    On a static host, set{" "}
                    <code className="text-foreground">VITE_API_URL</code> to
                    your API origin and rebuild.
                  </>
                ) : (
                  <>Is the Bun API running?</>
                )}
              </p>
            ) : exampleRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rows yet. Seed{" "}
                <code className="text-foreground">examples</code> in SQLite or
                insert via Drizzle.
              </p>
            ) : (
              <ul
                className="text-sm space-y-1 font-mono"
                data-testid="server-examples-list"
              >
                {exampleRows.map((row) => (
                  <li key={row.id}>
                    <span className="text-muted-foreground">#{row.id}</span>{" "}
                    {row.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {moduleIds.map((id) => (
          <div
            key={id}
            className="p-6 rounded-xl border bg-card text-card-foreground shadow"
          >
            <h3 className="font-semibold mb-2">Module_{id}</h3>
            <div className="h-24 w-full bg-muted rounded-md animate-pulse" />
          </div>
        ))}
      </section>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-2xl font-bold">Scroll & Typography Check</h2>
        {scrollParagraphKeys.map((key) => (
          <p key={key} className="leading-7 text-muted-foreground">
            This is a placeholder paragraph to test typography and vertical
            scrolling. If the sidebar and navbar stay in place while this moves,
            your layout overflow is configured correctly.
          </p>
        ))}
      </section>

      <footer className="pt-8 flex gap-4">
        <button
          type="button"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Primary Action
        </button>
        <button type="button" className="px-4 py-2 border rounded-md">
          Secondary Action
        </button>
      </footer>
    </div>
  );
};
