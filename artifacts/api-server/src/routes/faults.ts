import { Router } from "express";
import { db } from "@workspace/db";
import { faultsTable } from "@workspace/db";
import { and, eq, ilike, gte, lte, desc, asc, sql, countDistinct } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import type { Column } from "drizzle-orm";

const router = Router();

function buildWhere(q: Record<string, string | undefined>) {
  const conditions = [];
  if (q["search"]) {
    const s = `%${q["search"]}%`;
    conditions.push(sql`(
      ${faultsTable.locoNo} ilike ${s} or
      ${faultsTable.faultCode} ilike ${s} or
      ${faultsTable.faultDescription} ilike ${s} or
      ${faultsTable.uniqueFaultId} ilike ${s} or
      ${faultsTable.coachNumber} ilike ${s}
    )`);
  }
  if (q["dateFrom"]) conditions.push(gte(faultsTable.createdAt, new Date(q["dateFrom"] as string)));
  if (q["dateTo"]) {
    const end = new Date(q["dateTo"] as string); end.setHours(23, 59, 59, 999);
    conditions.push(lte(faultsTable.createdAt, end));
  }
  if (q["zone"]) conditions.push(eq(faultsTable.zone, q["zone"]));
  if (q["shed"]) conditions.push(eq(faultsTable.shed, q["shed"]));
  if (q["locoNo"]) conditions.push(ilike(faultsTable.locoNo, `%${q["locoNo"]}%`));
  if (q["coachNumber"]) conditions.push(ilike(faultsTable.coachNumber, `%${q["coachNumber"]}%`));
  if (q["faultCode"]) conditions.push(eq(faultsTable.faultCode, q["faultCode"]));
  if (q["category"]) conditions.push(eq(faultsTable.category, q["category"]));
  if (q["moduleName"]) conditions.push(eq(faultsTable.moduleName, q["moduleName"]));
  if (q["basicUnit"]) conditions.push(eq(faultsTable.basicUnit, q["basicUnit"]));
  if (q["location"]) conditions.push(eq(faultsTable.location, q["location"]));
  if (q["coachType"]) conditions.push(eq(faultsTable.coachType, q["coachType"]));
  if (q["recoveryStatus"]) conditions.push(eq(faultsTable.recoveryStatus, q["recoveryStatus"]));
  return conditions.length ? and(...conditions) : undefined;
}

const ALLOWED_SORT_COLS: Record<string, Column> = {
  id: faultsTable.id,
  createdAt: faultsTable.createdAt,
  locoNo: faultsTable.locoNo,
  zone: faultsTable.zone,
  shed: faultsTable.shed,
  faultCode: faultsTable.faultCode,
  category: faultsTable.category,
  recoveryStatus: faultsTable.recoveryStatus,
  loggedTimestamp: faultsTable.loggedTimestamp,
};

router.get("/faults/filter-options", requireAuth, async (_req, res) => {
  const [zones, sheds, categories, faultCodes, modules, basicUnits, locations, coachTypes] = await Promise.all([
    db.selectDistinct({ val: faultsTable.zone }).from(faultsTable).where(sql`${faultsTable.zone} is not null`),
    db.selectDistinct({ val: faultsTable.shed }).from(faultsTable).where(sql`${faultsTable.shed} is not null`),
    db.selectDistinct({ val: faultsTable.category }).from(faultsTable).where(sql`${faultsTable.category} is not null`),
    db.selectDistinct({ val: faultsTable.faultCode }).from(faultsTable).where(sql`${faultsTable.faultCode} is not null`),
    db.selectDistinct({ val: faultsTable.moduleName }).from(faultsTable).where(sql`${faultsTable.moduleName} is not null`),
    db.selectDistinct({ val: faultsTable.basicUnit }).from(faultsTable).where(sql`${faultsTable.basicUnit} is not null`),
    db.selectDistinct({ val: faultsTable.location }).from(faultsTable).where(sql`${faultsTable.location} is not null`),
    db.selectDistinct({ val: faultsTable.coachType }).from(faultsTable).where(sql`${faultsTable.coachType} is not null`),
  ]);
  res.json({
    zones: zones.map(r => r.val).filter(Boolean),
    sheds: sheds.map(r => r.val).filter(Boolean),
    categories: categories.map(r => r.val).filter(Boolean),
    faultCodes: faultCodes.map(r => r.val).filter(Boolean),
    modules: modules.map(r => r.val).filter(Boolean),
    basicUnits: basicUnits.map(r => r.val).filter(Boolean),
    locations: locations.map(r => r.val).filter(Boolean),
    coachTypes: coachTypes.map(r => r.val).filter(Boolean),
  });
});

router.get("/faults/export", requireAuth, async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string | undefined>;
  const format = q["format"] ?? "csv";
  const where = buildWhere(q);
  const rows = await db.select().from(faultsTable).where(where).orderBy(desc(faultsTable.createdAt)).limit(50000);

  if (format === "csv") {
    const cols = ["id","uniqueFaultId","alertType","locoNo","locoType","shed","zone","loggedTimestamp","faultCode","faultDescription","basicUnit","category","moduleName","coachNumber","location","datapack","coachType","recoveryStatus","downloadStatus","apiTimestamp","dbTimestamp","createdAt"];
    const header = cols.join(",");
    const csv = [header, ...rows.map(r => cols.map(c => JSON.stringify((r as Record<string, unknown>)[c] ?? "")).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="faults_export.csv"`);
    res.send(csv);
    return;
  }

  res.json({ downloadUrl: `/api/faults/export?format=csv`, filename: "faults_export.csv", records: rows.length });
});

router.get("/faults", requireAuth, async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt(q["page"] ?? "1"));
  const pageSize = Math.min(500, Math.max(1, parseInt(q["pageSize"] ?? "50")));
  const where = buildWhere(q);

  const sortBy = q["sortBy"] && ALLOWED_SORT_COLS[q["sortBy"]] ? q["sortBy"] : "createdAt";
  const sortOrder = q["sortOrder"] === "asc" ? "asc" : "desc";
  const sortCol = ALLOWED_SORT_COLS[sortBy]!;
  const orderFn = sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

  const [countResult, data] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(faultsTable).where(where),
    db.select().from(faultsTable).where(where).orderBy(orderFn).limit(pageSize).offset((page - 1) * pageSize),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

router.get("/faults/:id/history", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  const [fault] = await db.select({ locoNo: faultsTable.locoNo, faultCode: faultsTable.faultCode }).from(faultsTable).where(eq(faultsTable.id, id)).limit(1);
  if (!fault) { res.status(404).json({ error: "not_found", message: "Fault not found" }); return; }

  const conditions = [];
  if (fault.faultCode) conditions.push(eq(faultsTable.faultCode, fault.faultCode));
  if (fault.locoNo) conditions.push(eq(faultsTable.locoNo, fault.locoNo));
  const history = conditions.length
    ? await db.select().from(faultsTable).where(and(...conditions)).orderBy(desc(faultsTable.createdAt)).limit(100)
    : [];
  res.json(history);
});

router.get("/faults/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params["id"] ?? "0"));
  const [fault] = await db.select().from(faultsTable).where(eq(faultsTable.id, id)).limit(1);
  if (!fault) { res.status(404).json({ error: "not_found", message: "Fault not found" }); return; }
  res.json(fault);
});

export default router;
