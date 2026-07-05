import { db } from "@workspace/db";
import { faultMasterTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

export interface FaultMasterEntry {
  faultCode: string;
  faultDescription: string | null;
  rectificationProcess: string | null;
}

// In-memory lookup map: normalized fault code → entry
// Normalized = lowercase, trimmed, internal whitespace collapsed
const cache = new Map<string, FaultMasterEntry>();
let cacheLoaded = false;

function normalize(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Load (or reload) the fault master into memory from the DB */
export async function loadFaultMasterCache(): Promise<void> {
  try {
    const rows = await db.select().from(faultMasterTable);
    cache.clear();
    for (const row of rows) {
      cache.set(normalize(row.faultCode), {
        faultCode: row.faultCode,
        faultDescription: row.faultDescription,
        rectificationProcess: row.rectificationProcess,
      });
    }
    cacheLoaded = true;
    logger.info({ count: cache.size }, "Fault master cache loaded");
  } catch (err) {
    logger.error({ err }, "Failed to load fault master cache");
  }
}

/** Look up a fault code — loads cache lazily if not yet loaded */
export async function lookupFaultMaster(faultCode: string | null | undefined): Promise<FaultMasterEntry | null> {
  if (!faultCode) return null;
  if (!cacheLoaded) await loadFaultMasterCache();
  return cache.get(normalize(faultCode)) ?? null;
}

/** Update the entire fault master (used after Excel upload) */
export async function replaceFaultMaster(
  records: Array<{ faultCode: string; faultDescription: string | null; rectificationProcess: string | null }>,
  meta: { filename: string }
): Promise<{ imported: number; duplicates: number }> {
  // Remove all existing records in a transaction
  await db.delete(faultMasterTable);

  let imported = 0;
  let duplicates = 0;
  const seen = new Set<string>();

  const toInsert: typeof records = [];
  for (const rec of records) {
    const key = normalize(rec.faultCode);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    toInsert.push(rec);
  }

  if (toInsert.length > 0) {
    await db.insert(faultMasterTable).values(toInsert);
    imported = toInsert.length;
  }

  // Update settings metadata
  const now = new Date().toISOString();
  const metaEntries = [
    { key: "fault_master_filename", value: meta.filename },
    { key: "fault_master_uploaded_at", value: now },
    { key: "fault_master_total_records", value: String(imported) },
  ];
  for (const entry of metaEntries) {
    await db
      .insert(settingsTable)
      .values({ key: entry.key, value: entry.value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: entry.value, updatedAt: new Date() } });
  }

  // Reload the in-memory cache
  await loadFaultMasterCache();
  logger.info({ imported, duplicates, filename: meta.filename }, "Fault master replaced");
  return { imported, duplicates };
}

/** Clear the fault master */
export async function clearFaultMaster(): Promise<void> {
  await db.delete(faultMasterTable);
  cache.clear();
  const keys = ["fault_master_filename", "fault_master_uploaded_at", "fault_master_total_records"];
  for (const key of keys) {
    await db.delete(settingsTable).where(eq(settingsTable.key, key));
  }
  logger.info("Fault master cleared");
}

export function getCacheSize(): number {
  return cache.size;
}
