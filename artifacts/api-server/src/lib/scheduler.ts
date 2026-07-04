import * as cron from "node-cron";
import { fetchAndStoreFaults } from "./loconet.js";
import { logger } from "./logger.js";

let schedulerTask: ReturnType<typeof cron.schedule> | null = null;
let lastRun: Date | null = null;
let nextRun: Date | null = null;
let intervalMinutes = 2;

export function startScheduler(minutes: number = 2) {
  intervalMinutes = minutes;
  if (schedulerTask) {
    schedulerTask.stop();
  }
  const cronExpr = `*/${minutes} * * * *`;
  schedulerTask = cron.schedule(cronExpr, async () => {
    lastRun = new Date();
    nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000);
    try {
      await fetchAndStoreFaults();
    } catch (err) {
      logger.error({ err }, "Scheduler fetch error");
    }
  });
  nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000);
  logger.info({ intervalMinutes }, "Scheduler started");
}

export function stopScheduler() {
  schedulerTask?.stop();
  schedulerTask = null;
}

export function getSchedulerStatus() {
  return {
    running: schedulerTask !== null,
    lastRun: lastRun?.toISOString() ?? null,
    nextRun: nextRun?.toISOString() ?? null,
    intervalMinutes,
  };
}

export function updateInterval(minutes: number) {
  intervalMinutes = minutes;
  startScheduler(minutes);
}
