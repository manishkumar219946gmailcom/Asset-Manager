import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startScheduler } from "./lib/scheduler.js";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function getIntervalMinutes(): Promise<number> {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "refreshInterval")).limit(1);
    const val = parseInt(rows[0]?.value ?? "2");
    return isNaN(val) || val < 1 ? 2 : val;
  } catch {
    return 2;
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  const minutes = await getIntervalMinutes();
  startScheduler(minutes);
  logger.info({ minutes }, "Scheduler started");
});
