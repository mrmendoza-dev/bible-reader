import { Elysia } from "elysia";
import { examplesRoutes } from "./examples";

export const apiRoutes = new Elysia({ prefix: "/api" })
  .get("/", () => ({
    name: "bible-reader-api",
    status: "ok",
  }))
  .get("/health", () => ({ status: "ok" as const }))
  .use(examplesRoutes);
