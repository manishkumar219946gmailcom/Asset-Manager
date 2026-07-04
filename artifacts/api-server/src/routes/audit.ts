import { Router } from "express";
import { db } from "@workspace/db";
import { apiLogsTable, loginHistoryTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/audit/api-logs", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
  const pageSize = Math.min(200, Math.max(1, parseInt((req.query["pageSize"] as string) ?? "50")));

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(apiLogsTable),
    db.select().from(apiLogsTable).orderBy(desc(apiLogsTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

router.get("/audit/login-history", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
  const pageSize = Math.min(200, Math.max(1, parseInt((req.query["pageSize"] as string) ?? "50")));

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(loginHistoryTable),
    db.select().from(loginHistoryTable).orderBy(desc(loginHistoryTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

export default router;
