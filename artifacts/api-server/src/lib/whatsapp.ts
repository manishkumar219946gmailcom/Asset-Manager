import axios from "axios";
import { db } from "@workspace/db";
import { alertLogsTable } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

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
  const phoneNumberId = await getSetting("whatsappPhoneNumberId");
  const accessToken = await getSetting("whatsappAccessToken");
  const recipient = await getSetting("whatsappRecipient");
  const dashboardLink = await getSetting("dashboardLink");

  if (!phoneNumberId || !accessToken || !recipient) {
    logger.warn("WhatsApp not configured, skipping alert");
    return;
  }

  const alreadySent = await db.select().from(alertLogsTable)
    .where(eq(alertLogsTable.uniqueFaultId, fault.uniqueFaultId))
    .limit(1);

  if (alreadySent.length > 0) {
    return;
  }

  const message = `CATEGORY A FAULT ALERT\n\nLoco No: ${fault.locoNo ?? "N/A"}\nCoach: ${fault.coachNumber ?? "N/A"}\nFault Code: ${fault.faultCode ?? "N/A"}\nFault Description: ${fault.faultDescription ?? "N/A"}\nModule: ${fault.moduleName ?? "N/A"}\nBasic Unit: ${fault.basicUnit ?? "N/A"}\nLocation: ${fault.location ?? "N/A"}\nTime: ${fault.loggedTimestamp ?? "N/A"}\n\nOpen Dashboard: ${dashboardLink || "https://your-dashboard-link.com"}`;

  const [logEntry] = await db.insert(alertLogsTable).values({
    faultId: fault.id,
    uniqueFaultId: fault.uniqueFaultId,
    locoNo: fault.locoNo,
    faultCode: fault.faultCode,
    whatsappNumber: recipient,
    message,
    status: "pending",
  }).returning();

  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    await db.update(alertLogsTable)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(alertLogsTable.id, logEntry.id));

    logger.info({ faultId: fault.id }, "WhatsApp alert sent");
  } catch (err) {
    await db.update(alertLogsTable)
      .set({ status: "failed" })
      .where(eq(alertLogsTable.id, logEntry.id));
    logger.error({ err, faultId: fault.id }, "WhatsApp alert failed");
  }
}
