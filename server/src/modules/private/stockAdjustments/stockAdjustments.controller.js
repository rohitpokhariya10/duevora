// Importing modules
import mongoose from "mongoose";
import StockAdjustmentDao from "../../../shared/dao/stockAdjustment.dao.js";
import ProductDao from "../../../shared/dao/product.dao.js";
import WarehouseDao from "../../../shared/dao/warehouse.dao.js";
import EmployeeDao from "../../../shared/dao/employee.dao.js";
import InventoryDao from "../../../shared/dao/inventory.dao.js";
import StockMovementDao from "../../../shared/dao/stockMovement.dao.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle stock adjustment operations
class StockAdjustmentsController {

    constructor() {

        // initializing the daos
        this.stockAdjustmentDao = new StockAdjustmentDao();
        this.productDao = new ProductDao();
        this.warehouseDao = new WarehouseDao();
        this.employeeDao = new EmployeeDao();
        this.inventoryDao = new InventoryDao();
        this.stockMovementDao = new StockMovementDao();

    }

    // create a new stock adjustment
    createStockAdjustment = async (req, res) => {

        const { warehouseId, productId, adjustedQuantity, reason, date } = req.body;
        const organizationId = req.user.organizationId;

        // fetching caller's employee profile matching their user id
        const employee = await this.employeeDao.findOne({
            userId: req.user._id,
            organizationId
        });

        if (!employee) {

            throw new NotFound("Employee profile not found in your organization.");

        }

        // validating referenced product exists in organization context
        const product = await this.productDao.findOne({
            _id: productId,
            organizationId,
            isDeleted: {
                $ne: true
            }
        });

        if (!product) {

            throw new NotFound("Product not found in your organization.");

        }

        // validating referenced warehouse exists in organization context
        const warehouse = await this.warehouseDao.findOne({
            _id: warehouseId,
            organizationId
        });

        if (!warehouse) {

            throw new NotFound("Warehouse not found in your organization.");

        }

        // creating stock adjustment record using stock adjustment dao (default status Draft)
        const adjustment = await this.stockAdjustmentDao.create({
            organizationId,
            warehouseId,
            productId,
            adjustedQuantity,
            reason: reason || "",
            date: date ? new Date(date) : undefined,
            adjustedById: employee._id,
            status: "Draft"
        });

        return Created(res, "Stock adjustment created successfully", adjustment);

    }

    // approve a stock adjustment
    approveStockAdjustment = async (req, res) => {

        const { adjustmentId } = req.params;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // finding the stock adjustment draft within organization context
            const adjustment = await this.stockAdjustmentDao.findOne({
                _id: adjustmentId,
                organizationId
            }, session);

            if (!adjustment) {

                throw new NotFound("Stock adjustment not found in your organization.");

            }

            if (adjustment.status !== "Draft") {

                throw new BadRequest("Only Draft stock adjustments can be approved.");

            }

            // finding or creating the inventory record for this product and warehouse
            let inventory = await this.inventoryDao.Model.findOne({
                organizationId,
                productId: adjustment.productId,
                warehouseId: adjustment.warehouseId
            }).session(session);

            if (!inventory) {

                inventory = new this.inventoryDao.Model({
                    organizationId,
                    productId: adjustment.productId,
                    warehouseId: adjustment.warehouseId,
                    quantity: 0
                });

            }

            // updating the inventory quantity
            inventory.quantity += adjustment.adjustedQuantity;
            await inventory.save({ session });

            // creating a stock movement log entry
            await this.stockMovementDao.create({
                organizationId,
                productId: adjustment.productId,
                warehouseId: adjustment.warehouseId,
                quantity: Math.abs(adjustment.adjustedQuantity),
                type: adjustment.adjustedQuantity > 0 ? "in" : "out",
                referenceType: "StockAdjustment",
                referenceId: adjustment._id,
                date: new Date()
            }, session);

            // updating status of stock adjustment to Completed
            adjustment.status = "Completed";
            await adjustment.save({ session });

            // committing transaction
            await session.commitTransaction();

            return Ok(res, "Stock adjustment approved successfully", adjustment);

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

    }

}

export default StockAdjustmentsController;
