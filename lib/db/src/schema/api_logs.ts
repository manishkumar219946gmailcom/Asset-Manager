import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const apiLogsTable = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  statusCode: integer("status_code"),
  responseTime: integer("response_time"),
  recordsFetched: integer("records_fetched"),
  newRecords: integer("new_records"),
  updatedRecords: integer("updated_records"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ApiLog = typeof apiLogsTable.$inferSelect;
