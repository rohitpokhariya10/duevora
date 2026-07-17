// Importing modules
import express from "express";
import publicAuthRouter from "../../modules/public/auth/auth.router.js";
import privateAuthRouter from "../../modules/private/auth/auth.router.js";

// making the router
const router = express.Router();

// mounting public and private auth routers at the root /
router.use("/", publicAuthRouter);
router.use("/", privateAuthRouter);

// exporting the router
export default router;
