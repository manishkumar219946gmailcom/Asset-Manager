import { Router } from "express";
import { db } from "@workspace/db";
import { alertLogsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/alerts", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
  const pageSize = Math.min(200, Math.max(1, parseInt((req.query["pageSize"] as string) ?? "50")));
  const status = req.query["status"] as string | undefined;

  const where = status ? eq(alertLogsTable.status, status as "sent" | "failed" | "pending") : undefined;

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(alertLogsTable).where(where),
    db.select().from(alertLogsTable).where(where).orderBy(desc(alertLogsTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

export default router;
