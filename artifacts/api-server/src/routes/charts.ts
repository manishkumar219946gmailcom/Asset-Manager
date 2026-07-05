import { Router } from "express";
import { db } from "@workspace/db";
import { faultsTable } from "@workspace/db";
import { and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function dateWhere(q: Record<string, string | undefined>) {
  const conditions = [];
  if (q["dateFrom"]) conditions.push(gte(faultsTable.createdAt, new Date(q["dateFrom"])));
  if (q["dateTo"]) {
    const end = new Date(q["dateTo"]); end.setHours(23, 59, 59, 999);
    conditions.push(lte(faultsTable.createdAt, end));
  }
  return conditions.length ? and(...conditions) : undefined;
}

router.get("/charts/category-pie", requireAuth, async (req, res) => {
  const where = dateWhere(req.query as Record<string, string | undefined>);
  const rows = await db.select({
    name: faultsTable.category,
    count: sql<number>`count(*)::int`,
  }).from(faultsTable).where(and(where, sql`${faultsTable.category} is not null`))
    .groupBy(faultsTable.category).orderBy(sql`count(*) desc`);
  res.json(rows.map(r => ({ name: r.name ?? "Unknown", count: r.count })));
});

router.get("/charts/fault-trend", requireAuth, async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const days = parseInt(q["days"] ?? "30");
  const period = q["period"] ?? "daily";
  const where = dateWhere(q);

  // Default to last N days if no dateFrom specified
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - days);
  const effectiveWhere = where ?? gte(faultsTable.createdAt, defaultFrom);

  let truncExpr: ReturnType<typeof sql>;
  if (period === "hourly") truncExpr = sql`date_trunc('hour', ${faultsTable.createdAt})`;
  else if (period === "monthly") truncExpr = sql`date_trunc('month', ${faultsTable.createdAt})`;
  else truncExpr = sql`date_trunc('day', ${faultsTable.createdAt})`;

  const rows = await db.select({
    date: truncExpr,
    count: sql<number>`count(*)::int`,
  }).from(faultsTable).where(effectiveWhere)
    .groupBy(truncExpr).orderBy(truncExpr).limit(365);
  res.json(rows.map(r => ({ date: String(r.date).slice(0, 10), count: r.count })));
});

router.get("/charts/fault-code", requireAuth, async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const limit = Math.min(50, parseInt(q["limit"] ?? "10"));
  const where = dateWhere(q);
  const rows = await db.select({
    name: faultsTable.faultCode,
    count: sql<number>`count(*)::int`,
  }).from(faultsTable).where(and(where, sql`${faultsTable.faultCode} is not null`))
    .groupBy(faultsTable.faultCode).orderBy(sql`count(*) desc`).limit(limit);
  res.json(rows.map(r => ({ name: r.name ?? "Unknown", count: r.count })));
});

router.get("/charts/module", requireAuth, async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const limit = Math.min(50, parseInt(q["limit"] ?? "10"));
  const where = dateWhere(q);
  const rows = await db.select({
    name: faultsTable.moduleName,
    count: sql<number>`count(*)::int`,
  }).from(faultsTable).where(and(where, sql`${faultsTable.moduleName} is not null`))
    .groupBy(faultsTable.moduleName).orderBy(sql`count(*) desc`).limit(limit);
  res.json(rows.map(r => ({ name: r.name ?? "Unknown", count: r.count })));
});

router.get("/charts/location", requireAuth, async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const limit = Math.min(50, parseInt(q["limit"] ?? "10"));
  const where = dateWhere(q);
  const rows = await db.select({
    name: faultsTable.location,
    count: sql<number>`count(*)::int`,
  }).from(faultsTable).where(and(where, sql`${faultsTable.location} is not null`))
    .groupBy(faultsTable.location).orderBy(sql`count(*) desc`).limit(limit);
  res.json(rows.map(r => ({ name: r.name ?? "Unknown", count: r.count })));
});

router.get("/charts/loco", requireAuth, async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const limit = Math.min(50, parseInt(q["limit"] ?? "10"));
  const where = dateWhere(q);
  const rows = await db.select({
    name: faultsTable.locoNo,
    count: sql<number>`count(*)::int`,
  }).from(faultsTable).where(and(where, sql`${faultsTable.locoNo} is not null`))
    .groupBy(faultsTable.locoNo).orderBy(sql`count(*) desc`).limit(limit);
  res.json(rows.map(r => ({ name: r.name ?? "Unknown", count: r.count })));
});

router.get("/charts/recovery-trend", requireAuth, async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const days = parseInt(q["days"] ?? "30");
  const period = q["period"] ?? "daily";
  const where = dateWhere(q);

  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - days);
  const effectiveWhere = where ?? gte(faultsTable.createdAt, defaultFrom);

  let truncExpr: ReturnType<typeof sql>;
  if (period === "monthly") truncExpr = sql`date_trunc('month', ${faultsTable.createdAt})`;
  else truncExpr = sql`date_trunc('day', ${faultsTable.createdAt})`;

  const rows = await db.select({
    date: truncExpr,
    active: sql<number>`count(*) filter (where lower(coalesce(${faultsTable.recoveryStatus},'active')) != 'recovered')::int`,
    recovered: sql<number>`count(*) filter (where lower(${faultsTable.recoveryStatus}) = 'recovered')::int`,
  }).from(faultsTable).where(effectiveWhere)
    .groupBy(truncExpr).orderBy(truncExpr).limit(365);
  res.json(rows.map(r => ({ date: String(r.date).slice(0, 10), active: r.active, recovered: r.recovered })));
});

export default router;
