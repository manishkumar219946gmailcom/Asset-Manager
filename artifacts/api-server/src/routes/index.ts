import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import dashboardRouter from "./dashboard.js";
import faultsRouter from "./faults.js";
import chartsRouter from "./charts.js";
import alertsRouter from "./alerts.js";
import auditRouter from "./audit.js";
import settingsRouter from "./settings.js";
import faultMasterRouter from "./fault-master.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(faultsRouter);
router.use(chartsRouter);
router.use(alertsRouter);
router.use(auditRouter);
router.use(settingsRouter);
router.use(faultMasterRouter);

export default router;
