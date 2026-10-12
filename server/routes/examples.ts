import { Elysia } from "elysia";
import { getDb } from "../db";
import { examples } from "../db/schema";

export const examplesRoutes = new Elysia().get("/examples", () =>
  getDb().select().from(examples),
);
