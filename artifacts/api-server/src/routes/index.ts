import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import usersRouter from "./users.js";
import queueRouter from "./queue.js";
import matchesRouter from "./matches.js";
import statsRouter from "./stats.js";
import signalRouter from "./signal.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/queue", queueRouter);
router.use("/matches", matchesRouter);
router.use("/matches", signalRouter);
router.use("/stats", statsRouter);

export default router;
