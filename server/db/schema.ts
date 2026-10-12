import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Example entity — replace or extend with your domain models. */
export const examples = sqliteTable("examples", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
});
