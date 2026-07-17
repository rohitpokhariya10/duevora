// Importing modules
import mongoose from "mongoose";
import StockTransferDao from "../../../shared/dao/stockTransfer.dao.js";
import InventoryDao from "../../../shared/dao/inventory.dao.js";
import StockMovementDao from "../../../shared/dao/stockMovement.dao.js";
import WarehouseDao from "../../../shared/dao/warehouse.dao.js";
import ProductDao from "../../../shared/dao/product.dao.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Ok from "../../../shared/responses/Ok.response.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle stock transfer operations
class StockTransfersController {

    constructor() {

        // initializing the daos
        this.stockTransferDao = new StockTransferDao();
        this.inventoryDao = new InventoryDao();
        this.stockMovementDao = new StockMovementDao();
        this.warehouseDao = new WarehouseDao();
        this.productDao = new ProductDao();

    }

    // create a new stock transfer
    createStockTransfer = async (req, res) => {

        const { fromWarehouseId, toWarehouseId, productId, quantity, transferDate } = req.body;
        const organizationId = req.user.organizationId;

        if (fromWarehouseId === toWarehouseId) throw new BadRequest("Source and destination warehouses must be different.");

        const fromWh = await this.warehouseDao.findOne({ _id: fromWarehouseId, organizationId });
        if (!fromWh) throw new NotFound("Source warehouse not found in your organization.");

        const toWh = await this.warehouseDao.findOne({ _id: toWarehouseId, organizationId });
        if (!toWh) throw new NotFound("Destination warehouse not found in your organization.");

        const product = await this.productDao.findOne({ _id: productId, organizationId });
        if (!product) throw new NotFound("Product not found in your organization.");

        const transfer = await this.stockTransferDao.create({
            organizationId, fromWarehouseId, toWarehouseId, productId,
            quantity, transferDate: transferDate ? new Date(transferDate) : new Date(),
            status: "pending"
        });

        return Created(res, "Stock transfer created successfully", transfer);

    }

    // approve a stock transfer
    approveStockTransfer = async (req, res) => {

        const { transferId } = req.params;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // finding the stock transfer pending within organization context
            const transfer = await this.stockTransferDao.findOne({
                _id: transferId,
                organizationId
            }, session);

            if (!transfer) {

                throw new NotFound("Stock transfer not found in your organization.");

            }

            if (transfer.status !== "pending") {

                throw new BadRequest("Only pending stock transfers can be approved.");

            }

            // verifying source warehouse has sufficient stock
            const sourceInventory = await this.inventoryDao.Model.findOne({
                organizationId,
                productId: transfer.productId,
                warehouseId: transfer.fromWarehouseId
            }).session(session);

            if (!sourceInventory || sourceInventory.quantity < transfer.quantity) {

                throw new BadRequest("Insufficient stock in source warehouse.");

            }

            // decrementing stock from source warehouse
            sourceInventory.quantity -= transfer.quantity;
            await sourceInventory.save({ session });

            // finding or creating destination inventory record
            let destInventory = await this.inventoryDao.Model.findOne({
                organizationId,
                productId: transfer.productId,
                warehouseId: transfer.toWarehouseId
            }).session(session);

            if (!destInventory) {

                destInventory = new this.inventoryDao.Model({
                    organizationId,
                    productId: transfer.productId,
                    warehouseId: transfer.toWarehouseId,
                    quantity: 0
                });

            }

            // incrementing stock in destination warehouse
            destInventory.quantity += transfer.quantity;
            await destInventory.save({ session });

            // logging OUT stock movement for source warehouse
            await this.stockMovementDao.create({
                organizationId,
                productId: transfer.productId,
                warehouseId: transfer.fromWarehouseId,
                quantity: transfer.quantity,
                type: "out",
                referenceType: "StockTransfer",
                referenceId: transfer._id,
                date: new Date()
            }, session);

            // logging IN stock movement for destination warehouse
            await this.stockMovementDao.create({
                organizationId,
                productId: transfer.productId,
                warehouseId: transfer.toWarehouseId,
                quantity: transfer.quantity,
                type: "in",
                referenceType: "StockTransfer",
                referenceId: transfer._id,
                date: new Date()
            }, session);

            // updating status of stock transfer to completed
            transfer.status = "completed";
            await transfer.save({ session });

            // committing transaction
            await session.commitTransaction();

            return Ok(res, "Stock transfer approved successfully", transfer);

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

export default StockTransfersController;
