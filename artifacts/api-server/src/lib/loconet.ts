import axios from "axios";
import { db } from "@workspace/db";
import { faultsTable, settingsTable, apiLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendCategoryAAlert } from "./whatsapp.js";
import { logger } from "./logger.js";

async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return rows[0]?.value ?? "";
}

export async function fetchAndStoreFaults(): Promise<{ newRecords: number; updatedRecords: number }> {
  const apiEndpoint = await getSetting("apiEndpoint");
  const apiKey = await getSetting("apiKey");

  if (!apiEndpoint) {
    logger.warn("LocoNet API endpoint not configured");
    return { newRecords: 0, updatedRecords: 0 };
  }

  const startTime = Date.now();
  let statusCode: number | null = null;
  let errorMsg: string | null = null;
  let newRecords = 0;
  let updatedRecords = 0;
  let recordsFetched = 0;

  try {
    const response = await axios.get(apiEndpoint, {
      headers: apiKey ? { "X-API-Key": apiKey, "Authorization": `Bearer ${apiKey}` } : {},
      timeout: 30000,
    });

    statusCode = response.status;
    const data = Array.isArray(response.data) ? response.data : (response.data?.data ?? response.data?.faults ?? []);
    recordsFetched = data.length;

    for (const record of data) {
      const uniqueId = record.id ?? record.fault_id ?? record.uniqueFaultId ?? record.unique_fault_id;
      if (!uniqueId) continue;

      const existing = await db.select({ id: faultsTable.id, recoveryStatus: faultsTable.recoveryStatus })
        .from(faultsTable)
        .where(eq(faultsTable.uniqueFaultId, String(uniqueId)))
        .limit(1);

      const faultData = {
        uniqueFaultId: String(uniqueId),
        alertType: record.alert_type ?? record.alertType ?? null,
        locoNo: record.loco_no ?? record.locoNo ?? null,
        locoType: record.loco_type ?? record.locoType ?? null,
        shed: record.shed ?? null,
        zone: record.zone ?? null,
        loggedTimestamp: record.logged_timestamp ?? record.loggedTimestamp ?? null,
        faultCode: record.fault_code ?? record.faultCode ?? null,
        faultDescription: record.fault_description ?? record.faultDescription ?? null,
        basicUnit: record.basic_unit ?? record.basicUnit ?? null,
        category: record.category ?? null,
        moduleName: record.module_name ?? record.moduleName ?? null,
        coachNumber: record.coach_number ?? record.coachNumber ?? null,
        location: record.location ?? null,
        datapack: record.datapack ?? null,
        coachType: record.coach_type ?? record.coachType ?? null,
        recoveryStatus: record.recovery_status ?? record.recoveryStatus ?? null,
        downloadStatus: record.download_status ?? record.downloadStatus ?? null,
        apiTimestamp: record.api_timestamp ?? record.apiTimestamp ?? null,
      };

      if (existing.length === 0) {
        const [inserted] = await db.insert(faultsTable).values(faultData).returning();
        newRecords++;

        if (faultData.category === "A" || faultData.category === "Category A") {
          await sendCategoryAAlert(inserted);
        }
      } else {
        await db.update(faultsTable)
          .set({ recoveryStatus: faultData.recoveryStatus, downloadStatus: faultData.downloadStatus })
          .where(eq(faultsTable.uniqueFaultId, String(uniqueId)));
        updatedRecords++;
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "LocoNet fetch error");
  }

  await db.insert(apiLogsTable).values({
    endpoint: apiEndpoint,
    statusCode,
    responseTime: Date.now() - startTime,
    recordsFetched,
    newRecords,
    updatedRecords,
    error: errorMsg,
  });

  return { newRecords, updatedRecords };
}
