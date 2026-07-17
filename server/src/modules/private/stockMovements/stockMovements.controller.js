// Importing modules
import StockMovementDao from "../../../shared/dao/stockMovement.dao.js";

// class to handle stock movement operations
class StockMovementsController {

    constructor() {

        // initializing the stock movement dao
        this.stockMovementDao = new StockMovementDao();

    }

    // list stock movements
    listStockMovements = async (req, res) => {

        const organizationId = req.user.organizationId;
        const { productId, warehouseId, type } = req.query;

        // formulating filter based on organization isolation
        const filter = {
            organizationId
        };

        if (productId) {

            filter.productId = productId;

        }

        if (warehouseId) {

            filter.warehouseId = warehouseId;

        }

        if (type) {

            filter.type = type;

        }

        // parsing pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // counting total matching documents
        const total = await this.stockMovementDao.Model.countDocuments(filter);

        // fetching stock movements using stock movement dao, sorted by newest first
        const movements = await this.stockMovementDao.find(filter, {
            sort: { date: -1, createdAt: -1 },
            limit,
            skip
        });

        // constructing pagination metadata
        const pages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            status: 200,
            message: "Stock movements retrieved successfully",
            data: movements,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        });

    }

}

export default StockMovementsController;
