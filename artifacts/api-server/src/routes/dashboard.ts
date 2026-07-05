import { Router } from "express";
import { db } from "@workspace/db";
import { faultsTable } from "@workspace/db";
import { and, gte, lt, sql, countDistinct } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getSchedulerStatus } from "../lib/scheduler.js";
import { fetchAndStoreFaults } from "../lib/loconet.js";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res) => {
  // All-time totals
  const [allTime] = await db.select({
    totalFaults: sql<number>`count(*)::int`,
    categoryA: sql<number>`count(*) filter (where ${faultsTable.category} = 'A')::int`,
    categoryB: sql<number>`count(*) filter (where ${faultsTable.category} = 'B')::int`,
    categoryC: sql<number>`count(*) filter (where ${faultsTable.category} = 'C')::int`,
    recovered: sql<number>`count(*) filter (where lower(${faultsTable.recoveryStatus}) = 'recovered')::int`,
    activeFaults: sql<number>`count(*) filter (where lower(coalesce(${faultsTable.recoveryStatus},'active')) != 'recovered')::int`,
  }).from(faultsTable);

  const [uniqueLocos] = await db.select({
    count: countDistinct(faultsTable.locoNo),
  }).from(faultsTable);

  // Today's count
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
  const [today] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(faultsTable).where(and(gte(faultsTable.createdAt, dayStart), lt(faultsTable.createdAt, dayEnd)));

  res.json({
    totalFaults: allTime?.totalFaults ?? 0,
    categoryA: allTime?.categoryA ?? 0,
    categoryB: allTime?.categoryB ?? 0,
    categoryC: allTime?.categoryC ?? 0,
    recovered: allTime?.recovered ?? 0,
    activeFaults: allTime?.activeFaults ?? 0,
    uniqueLocos: uniqueLocos?.count ?? 0,
    todayFaults: today?.count ?? 0,
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
