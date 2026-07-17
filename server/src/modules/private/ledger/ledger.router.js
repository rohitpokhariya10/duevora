// Importing modules
import express from "express";
import LedgerController from "./ledger.controller.js";
import { getLedgerValidators } from "./ledger.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new LedgerController();

/*
    @route GET /api/ledger
    @desc List general ledger entries for organization
    @access Private (requires ledger.view permission)
*/
router.get("/", authMiddleware, permissionMiddleware("ledger.view"), getLedgerValidators, controller.getLedger);

export default router;
