import qrcode from "qrcode";
import path from "path";
import { db } from "@workspace/db";
import { alertLogsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";
import { lookupFaultMaster } from "./fault-master-cache.js";

// Lazy-loaded baileys socket
let sock: import("@whiskeysockets/baileys").WASocket | null = null;
let qrCodeDataUrl: string | null = null;
let connectionStatus: "disconnected" | "connecting" | "connected" = "disconnected";
let saveCreds: (() => Promise<void>) | null = null;

export function getWhatsAppStatus() {
  return { status: connectionStatus, qrCode: qrCodeDataUrl };
}

export async function initWhatsApp() {
  if (connectionStatus !== "disconnected") return;
  connectionStatus = "connecting";
  qrCodeDataUrl = null;

  try {
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default ?? baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason } = baileys;
    const { Boom } = await import("@hapi/boom");

    const authDir = path.resolve("./wa-auth");
    const { state, saveCreds: sc } = await useMultiFileAuthState(authDir);
    saveCreds = sc;

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: {
        level: "silent",
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        child: () => ({ level: "silent", trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({} as never) }),
      },
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          qrCodeDataUrl = await qrcode.toDataURL(qr);
          connectionStatus = "connecting";
          logger.info("WhatsApp QR code ready — scan from Settings page");
        } catch (err) {
          logger.error({ err }, "Failed to generate QR");
        }
      }

      if (connection === "close") {
        const boom = lastDisconnect?.error as InstanceType<typeof Boom> | undefined;
        const code = boom?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        connectionStatus = "disconnected";
        sock = null;
        qrCodeDataUrl = null;
        if (loggedOut) {
          logger.warn("WhatsApp logged out — delete wa-auth folder and reconnect");
        } else {
          logger.warn({ code }, "WhatsApp disconnected — reconnecting in 5s");
          setTimeout(() => initWhatsApp().catch(() => {}), 5000);
        }
      }

      if (connection === "open") {
        connectionStatus = "connected";
        qrCodeDataUrl = null;
        logger.info("WhatsApp connected and ready");
      }
    });

    sock.ev.on("creds.update", () => {
      saveCreds?.().catch(() => {});
    });
  } catch (err) {
    connectionStatus = "disconnected";
    sock = null;
    logger.warn({ err }, "WhatsApp init failed — ensure Node.js ≥18 and all deps installed");
  }
}

export async function getWhatsAppGroups(): Promise<{ id: string; name: string }[]> {
  if (!sock || connectionStatus !== "connected") return [];
  try {
    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups).map((g) => ({ id: g.id, name: g.subject }));
  } catch {
    return [];
  }
}

async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return rows[0]?.value ?? "";
}

export interface FaultForAlert {
  id: number;
  uniqueFaultId: string;
  locoNo: string | null;
  coachNumber: string | null;
  faultCode: string | null;
  faultDescription: string | null;
  moduleName: string | null;
  basicUnit: string | null;
  location: string | null;
  loggedTimestamp: string | null;
}

export async function sendCategoryAAlert(fault: FaultForAlert): Promise<void> {
  const groupId = await getSetting("whatsappGroupId");
  const alertEnabled = await getSetting("alert_enabled");

  if (alertEnabled === "false") return;
  if (!groupId) {
    logger.warn("WhatsApp group ID not configured, skipping alert");
    return;
  }
  if (!sock || connectionStatus !== "connected") {
    logger.warn("WhatsApp not connected, skipping alert");
    return;
  }

  const alreadySent = await db
    .select()
    .from(alertLogsTable)
    .where(eq(alertLogsTable.uniqueFaultId, fault.uniqueFaultId))
    .limit(1);
  if (alreadySent.length > 0) return;

  // Look up fault master for rectification process
  const masterEntry = await lookupFaultMaster(fault.faultCode);

  const dashboardLink = await getSetting("dashboardLink");

  // Parse loggedTimestamp into separate date and time
  let dateStr = "N/A";
  let timeStr = "N/A";
  if (fault.loggedTimestamp) {
    try {
      const d = new Date(fault.loggedTimestamp);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
        timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      } else {
        // Try as raw string split
        const parts = fault.loggedTimestamp.split(/[ T]/);
        dateStr = parts[0] ?? fault.loggedTimestamp;
        timeStr = parts[1]?.slice(0, 5) ?? "N/A";
      }
    } catch {
      dateStr = fault.loggedTimestamp;
    }
  }

  let message: string;

  if (masterEntry?.rectificationProcess) {
    // Enhanced message with rectification process from Fault Master
    message =
      `🚨 *CRITICAL FAULT DETECTED*\n\n` +
      `🚂 *Loco No:* ${fault.locoNo ?? "N/A"}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `🕐 *Time:* ${timeStr}\n\n` +
      `⚠️ *Fault Code:* ${fault.faultCode ?? "N/A"}\n` +
      `📋 *Fault Description:* ${masterEntry.faultDescription ?? fault.faultDescription ?? "N/A"}\n\n` +
      `=========================\n` +
      `*RECTIFICATION PROCESS*\n` +
      `=========================\n\n` +
      `${masterEntry.rectificationProcess}\n\n` +
      `=========================\n\n` +
      `⚡ *Please attend immediately.*` +
      (dashboardLink ? `\n\n🔗 Dashboard: ${dashboardLink}` : "");
  } else {
    // Standard message (no fault master match)
    message =
      `🚨 *CATEGORY A FAULT ALERT*\n\n` +
      `🚂 *Loco No:* ${fault.locoNo ?? "N/A"}\n` +
      `🔢 *Coach:* ${fault.coachNumber ?? "N/A"}\n` +
      `⚠️ *Fault Code:* ${fault.faultCode ?? "N/A"}\n` +
      `📋 *Description:* ${fault.faultDescription ?? "N/A"}\n` +
      `🔧 *Module:* ${fault.moduleName ?? "N/A"}\n` +
      `🏭 *Basic Unit:* ${fault.basicUnit ?? "N/A"}\n` +
      `📍 *Location:* ${fault.location ?? "N/A"}\n` +
      `🕐 *Time:* ${fault.loggedTimestamp ?? "N/A"}` +
      (dashboardLink ? `\n\n🔗 Dashboard: ${dashboardLink}` : "");
  }

  if (masterEntry) {
    logger.info({ faultCode: fault.faultCode }, "Fault master match found — enhanced alert with rectification");
  } else {
    logger.info({ faultCode: fault.faultCode }, "No fault master match — sending standard alert");
  }

  const [logEntry] = await db
    .insert(alertLogsTable)
    .values({
      faultId: fault.id,
      uniqueFaultId: fault.uniqueFaultId,
      locoNo: fault.locoNo,
      faultCode: fault.faultCode,
      whatsappNumber: groupId,
      message,
      status: "pending",
    })
    .returning();

  try {
    await sock.sendMessage(groupId, { text: message });
    await db
      .update(alertLogsTable)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(alertLogsTable.id, logEntry.id));
    logger.info({ faultId: fault.id, hasMasterEntry: !!masterEntry }, "WhatsApp group alert sent");
  } catch (err) {
    await db
      .update(alertLogsTable)
      .set({ status: "failed" })
      .where(eq(alertLogsTable.id, logEntry.id));
    logger.error({ err, faultId: fault.id }, "WhatsApp group alert failed");
  }
}
