import { Router } from "express";
import { db } from "@workspace/db";
import { faultsTable } from "@workspace/db";
import { and, eq, gte, lt, sql, countDistinct } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getSchedulerStatus } from "../lib/scheduler.js";
import { fetchAndStoreFaults } from "../lib/loconet.js";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  const dateStr = req.query["date"] as string | undefined;
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const [stats] = await db.select({
    totalFaultsToday: sql<number>`count(*)::int`,
    categoryA: sql<number>`count(*) filter (where ${faultsTable.category} = 'A')::int`,
    categoryB: sql<number>`count(*) filter (where ${faultsTable.category} = 'B')::int`,
    categoryC: sql<number>`count(*) filter (where ${faultsTable.category} = 'C')::int`,
    recoveredFaults: sql<number>`count(*) filter (where lower(${faultsTable.recoveryStatus}) = 'recovered')::int`,
    activeFaults: sql<number>`count(*) filter (where lower(${faultsTable.recoveryStatus}) != 'recovered' or ${faultsTable.recoveryStatus} is null)::int`,
  }).from(faultsTable).where(and(gte(faultsTable.createdAt, dayStart), lt(faultsTable.createdAt, dayEnd)));

  const [coachCount] = await db.select({ count: countDistinct(faultsTable.coachNumber) }).from(faultsTable)
    .where(and(gte(faultsTable.createdAt, dayStart), lt(faultsTable.createdAt, dayEnd)));

  const [locoCount] = await db.select({ count: countDistinct(faultsTable.locoNo) }).from(faultsTable)
    .where(and(gte(faultsTable.createdAt, dayStart), lt(faultsTable.createdAt, dayEnd)));

  res.json({
    totalFaultsToday: stats?.totalFaultsToday ?? 0,
    categoryA: stats?.categoryA ?? 0,
    categoryB: stats?.categoryB ?? 0,
    categoryC: stats?.categoryC ?? 0,
    recoveredFaults: stats?.recoveredFaults ?? 0,
    activeFaults: stats?.activeFaults ?? 0,
    todayCoaches: coachCount?.count ?? 0,
    todayLocoCount: locoCount?.count ?? 0,
    lastUpdated: new Date().toISOString(),
  });
});

router.get("/dashboard/scheduler", requireAuth, (_req, res) => {
  res.json(getSchedulerStatus());
});

router.post("/scheduler/trigger", requireAuth, async (_req, res) => {
  const { newRecords, updatedRecords } = await fetchAndStoreFaults();
  res.json({ message: "Fetch completed", newRecords, updatedRecords });
});

export default router;
