import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const alertStatusEnum = pgEnum("alert_status", ["sent", "failed", "pending"]);

export const alertLogsTable = pgTable("alert_logs", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull(),
  uniqueFaultId: text("unique_fault_id").notNull(),
  locoNo: text("loco_no"),
  faultCode: text("fault_code"),
  whatsappNumber: text("whatsapp_number").notNull(),
  message: text("message").notNull(),
  status: alertStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AlertLog = typeof alertLogsTable.$inferSelect;
