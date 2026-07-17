// Importing modules 
import express from "express";
import authRouter from "./auth.router.js";
import organizationRouter from "../../modules/private/organization/organization.router.js";
import employeesRouter from "../../modules/private/employees/employees.router.js";
import usersRouter from "../../modules/private/users/users.router.js";
import departmentsRouter from "../../modules/private/departments/departments.router.js";
import rolesRouter from "../../modules/private/roles/roles.router.js";
import customersRouter from "../../modules/private/customers/customers.router.js";
import vendorsRouter from "../../modules/private/vendors/vendors.router.js";
import categoriesRouter from "../../modules/private/categories/categories.router.js";
import unitsRouter from "../../modules/private/units/units.router.js";
import productsRouter from "../../modules/private/products/products.router.js";
import warehousesRouter from "../../modules/private/warehouses/warehouses.router.js";
import currenciesRouter from "../../modules/private/currencies/currencies.router.js";
import exchangeRatesRouter from "../../modules/private/exchangeRates/exchangeRates.router.js";
import inventoryRouter from "../../modules/private/inventory/inventory.router.js";
import stockMovementsRouter from "../../modules/private/stockMovements/stockMovements.router.js";
import stockAdjustmentsRouter from "../../modules/private/stockAdjustments/stockAdjustments.router.js";
import stockTransfersRouter from "../../modules/private/stockTransfers/stockTransfers.router.js";
import taxesRouter from "../../modules/private/taxes/taxes.router.js";
import quotationsRouter from "../../modules/private/quotations/quotations.router.js";
import salesOrdersRouter from "../../modules/private/salesOrders/salesOrders.router.js";
import deliveryChallansRouter from "../../modules/private/deliveryChallans/deliveryChallans.router.js";
import invoicesRouter from "../../modules/private/invoices/invoices.router.js";
import purchaseOrdersRouter from "../../modules/private/purchaseOrders/purchaseOrders.router.js";
import purchasesRouter from "../../modules/private/purchases/purchases.router.js";
import paymentsRouter from "../../modules/private/payments/payments.router.js";
import receiptsRouter from "../../modules/private/receipts/receipts.router.js";

// making the router
const router = express.Router();

// mounting the public routers
router.use("/auth", authRouter);
router.use("/organization", organizationRouter);
router.use("/employees", employeesRouter);
router.use("/users", usersRouter);
router.use("/departments", departmentsRouter);
router.use("/roles", rolesRouter);
router.use("/customers", customersRouter);
router.use("/vendors", vendorsRouter);
router.use("/categories", categoriesRouter);
router.use("/units", unitsRouter);
router.use("/products", productsRouter);
router.use("/warehouses", warehousesRouter);
router.use("/currencies", currenciesRouter);
router.use("/exchange-rates", exchangeRatesRouter);
router.use("/inventory", inventoryRouter);
router.use("/stock-movements", stockMovementsRouter);
router.use("/stock-adjustments", stockAdjustmentsRouter);
router.use("/stock-transfers", stockTransfersRouter);
router.use("/taxes", taxesRouter);
router.use("/quotations", quotationsRouter);
router.use("/sales-orders", salesOrdersRouter);
router.use("/delivery-challans", deliveryChallansRouter);
router.use("/invoices", invoicesRouter);
router.use("/purchase-orders", purchaseOrdersRouter);
router.use("/purchases", purchasesRouter);
router.use("/payments", paymentsRouter);
router.use("/receipts", receiptsRouter);

// exporting the router
export default router;