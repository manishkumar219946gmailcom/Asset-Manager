import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const faultsTable = pgTable("faults", {
  id: serial("id").primaryKey(),
  uniqueFaultId: text("unique_fault_id").notNull().unique(),
  alertType: text("alert_type"),
  locoNo: text("loco_no"),
  locoType: text("loco_type"),
  shed: text("shed"),
  zone: text("zone"),
  loggedTimestamp: text("logged_timestamp"),
  faultCode: text("fault_code"),
  faultDescription: text("fault_description"),
  basicUnit: text("basic_unit"),
  category: text("category"),
  moduleName: text("module_name"),
  coachNumber: text("coach_number"),
  location: text("location"),
  datapack: text("datapack"),
  coachType: text("coach_type"),
  recoveryStatus: text("recovery_status"),
  downloadStatus: text("download_status"),
  apiTimestamp: text("api_timestamp"),
  dbTimestamp: timestamp("db_timestamp").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index("faults_category_idx").on(table.category),
  zoneIdx: index("faults_zone_idx").on(table.zone),
  locoNoIdx: index("faults_loco_no_idx").on(table.locoNo),
  faultCodeIdx: index("faults_fault_code_idx").on(table.faultCode),
  createdAtIdx: index("faults_created_at_idx").on(table.createdAt),
}));

export const insertFaultSchema = createInsertSchema(faultsTable).omit({ id: true, createdAt: true, dbTimestamp: true });
export type InsertFault = z.infer<typeof insertFaultSchema>;
export type Fault = typeof faultsTable.$inferSelect;
