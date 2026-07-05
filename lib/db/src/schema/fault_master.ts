import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const faultMasterTable = pgTable("fault_master", {
  id: serial("id").primaryKey(),
  faultCode: text("fault_code").notNull(),
  faultDescription: text("fault_description"),
  rectificationProcess: text("rectification_process"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  faultCodeIdx: index("fault_master_code_idx").on(table.faultCode),
}));

export type FaultMasterRecord = typeof faultMasterTable.$inferSelect;
export type InsertFaultMasterRecord = typeof faultMasterTable.$inferInsert;
