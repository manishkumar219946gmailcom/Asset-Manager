import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import { updateInterval } from "../lib/scheduler.js";

const router = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  apiEndpoint: "",
  apiKey: "",
  refreshInterval: "2",
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
  whatsappRecipient: "",
  timezone: "Asia/Kolkata",
  dashboardLink: "",
};

async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

router.get("/settings", requireAdmin, async (_req, res) => {
  res.json(await getAllSettings());
});

router.put("/settings", requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    await db.insert(settingsTable)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
  }
  if (updates["refreshInterval"]) {
    const mins = parseInt(updates["refreshInterval"]);
    if (!isNaN(mins) && mins >= 1) updateInterval(mins);
  }
  res.json(await getAllSettings());
});

export default router;
