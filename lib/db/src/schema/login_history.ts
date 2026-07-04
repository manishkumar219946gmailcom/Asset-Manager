import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const loginHistoryTable = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  action: text("action").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LoginHistory = typeof loginHistoryTable.$inferSelect;
