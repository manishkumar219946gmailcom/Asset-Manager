import { Router } from "express";
import { db } from "@workspace/db";
import { alertLogsTable, settingsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { getWhatsAppStatus, initWhatsApp, getWhatsAppGroups, sendCategoryAAlert } from "../lib/whatsapp.js";

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

router.get("/alerts/whatsapp-status", requireAuth, (_req, res) => {
  res.json(getWhatsAppStatus());
});

router.post("/alerts/whatsapp-connect", requireAdmin, (_req, res) => {
  const { status } = getWhatsAppStatus();
  if (status === "connected") {
    res.json({ message: "Already connected" });
    return;
  }
  initWhatsApp().catch(() => {});
  res.json({ message: "Initializing — scan QR code when it appears" });
});

router.get("/alerts/whatsapp-groups", requireAdmin, async (_req, res) => {
  const groups = await getWhatsAppGroups();
  res.json(groups);
});

router.post("/alerts/test", requireAdmin, async (_req, res) => {
  const { status } = getWhatsAppStatus();
  if (status !== "connected") {
    res.status(400).json({ error: "not_connected", message: "WhatsApp is not connected. Scan the QR code in Settings first." });
    return;
  }

  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "whatsappGroupId")).limit(1);
  const groupId = rows[0]?.value ?? "";
  if (!groupId) {
    res.status(400).json({ error: "no_group", message: "No WhatsApp group configured. Set the Group ID in Settings." });
    return;
  }

  try {
    await sendCategoryAAlert({
      id: 0,
      uniqueFaultId: `TEST-${Date.now()}`,
      locoNo: "TEST-LOCO",
      coachNumber: "TEST-01",
      faultCode: "TEST",
      faultDescription: "Test alert — system check",
      moduleName: "Test Module",
      basicUnit: "Test Unit",
      location: "Test Location",
      loggedTimestamp: new Date().toISOString(),
    });
    res.json({ message: "Test alert sent to WhatsApp group" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "send_failed", message: msg });
  }
});

export default router;
