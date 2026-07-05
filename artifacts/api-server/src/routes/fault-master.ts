import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { faultMasterTable, settingsTable } from "@workspace/db";
import { desc, sql, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { replaceFaultMaster, clearFaultMaster, getCacheSize } from "../lib/fault-master-cache.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Memory storage — we parse in-process, never write to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only .xlsx and .xls files are accepted"), ok);
  },
});

// Required column names (case-insensitive matching)
const REQUIRED_COLS = ["fault code", "fault description", "rectification process"];

function findHeader(headerRow: string[], target: string): number {
  const t = target.toLowerCase().trim();
  return headerRow.findIndex((h) => String(h ?? "").toLowerCase().trim() === t);
}

/** GET /api/fault-master/status */
router.get("/fault-master/status", requireAuth, async (_req, res) => {
  const keys = ["fault_master_filename", "fault_master_uploaded_at", "fault_master_total_records"];
  const rows = await db.select().from(settingsTable).where(
    sql`${settingsTable.key} = any(${keys})`
  );
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  res.json({
    filename: map["fault_master_filename"] ?? null,
    uploadedAt: map["fault_master_uploaded_at"] ?? null,
    totalRecords: map["fault_master_total_records"] ? Number(map["fault_master_total_records"]) : 0,
    cacheSize: getCacheSize(),
    hasData: !!map["fault_master_filename"],
  });
});

/** GET /api/fault-master/preview?page=1&pageSize=50 */
router.get("/fault-master/preview", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
  const pageSize = Math.min(200, Math.max(1, parseInt((req.query["pageSize"] as string) ?? "50")));

  const [countResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(faultMasterTable),
    db.select().from(faultMasterTable)
      .orderBy(desc(faultMasterTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  res.json({
    data: rows,
    total: countResult[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((countResult[0]?.count ?? 0) / pageSize)),
  });
});

/** POST /api/fault-master/upload */
router.post(
  "/fault-master/upload",
  requireAdmin,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: "upload_error", message: err instanceof Error ? err.message : "Upload failed" });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "no_file", message: "No file uploaded. Send a .xlsx or .xls file in the 'file' field." });
      return;
    }

    try {
      // Parse Excel
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(file.buffer, { type: "buffer", cellText: true, cellDates: true });
      } catch {
        res.status(400).json({ error: "parse_error", message: "Could not parse the file. Ensure it is a valid .xlsx or .xls file." });
        return;
      }

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        res.status(400).json({ error: "empty_file", message: "The Excel file is empty — no sheets found." });
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      // Convert to array of arrays to preserve raw text (including multi-line)
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

      if (rows.length < 2) {
        res.status(400).json({ error: "empty_data", message: "The Excel file has no data rows (need at least a header row + 1 data row)." });
        return;
      }

      const headerRow = (rows[0] as string[]).map((h) => String(h ?? ""));

      // Validate required columns
      const missing = REQUIRED_COLS.filter((col) => findHeader(headerRow, col) === -1);
      if (missing.length > 0) {
        res.status(400).json({
          error: "missing_columns",
          message: `Missing required column(s): ${missing.join(", ")}. Found columns: ${headerRow.filter(Boolean).join(", ")}`,
        });
        return;
      }

      const codeIdx = findHeader(headerRow, "fault code");
      const descIdx = findHeader(headerRow, "fault description");
      const rectIdx = findHeader(headerRow, "rectification process");

      const records: Array<{ faultCode: string; faultDescription: string | null; rectificationProcess: string | null }> = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as string[];
        const faultCode = String(row[codeIdx] ?? "").trim();
        if (!faultCode) continue; // Skip blank rows

        records.push({
          faultCode,
          faultDescription: row[descIdx] ? String(row[descIdx]).trim() : null,
          rectificationProcess: row[rectIdx] ? String(row[rectIdx]).trim() : null,
        });
      }

      if (records.length === 0) {
        res.status(400).json({ error: "no_records", message: "No valid records found in the Excel file. Ensure Fault Code column is populated." });
        return;
      }

      const { imported, duplicates } = await replaceFaultMaster(records, { filename: file.originalname });

      logger.info({ filename: file.originalname, imported, duplicates }, "Fault master uploaded");

      res.json({
        message: `Fault master imported successfully`,
        filename: file.originalname,
        imported,
        duplicates,
        skippedBlank: records.length + duplicates - imported - duplicates,
      });
    } catch (err) {
      logger.error({ err }, "Fault master upload failed");
      res.status(500).json({ error: "server_error", message: err instanceof Error ? err.message : "Import failed" });
    }
  }
);

/** DELETE /api/fault-master */
router.delete("/fault-master", requireAdmin, async (_req, res) => {
  await clearFaultMaster();
  res.json({ message: "Fault master cleared" });
});

export default router;
