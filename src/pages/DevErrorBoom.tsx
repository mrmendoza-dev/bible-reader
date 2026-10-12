/** Dev-only route: throws on render to exercise error UI. See `/dev/error-boom`. */
export const DevErrorBoom = () => {
  throw new Error(
    "Intentional error (visit /dev/error-boom only in development to test error UI).",
  );
};
