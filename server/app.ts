import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { apiRoutes } from "./routes";

export const createApp = () =>
  new Elysia()
    .use(
      cors({
        origin: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )
    .use(apiRoutes);

export type App = ReturnType<typeof createApp>;
