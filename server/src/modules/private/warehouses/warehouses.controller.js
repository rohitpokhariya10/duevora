// Importing modules
import WarehouseDao from "../../../shared/dao/warehouse.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle warehouse operations
class WarehousesController {

    constructor() {

        // initializing the warehouse dao
        this.warehouseDao = new WarehouseDao();

    }

    // create a new warehouse
    createWarehouse = async (req, res) => {

        const { name, code, address, status } = req.body;
        const organizationId = req.user.organizationId;

        // verifying warehouse code is unique within the organization context
        const existingWarehouse = await this.warehouseDao.findOne({
            organizationId,
            code: code.toUpperCase()
        });

        if (existingWarehouse) {

            throw new Conflict("Warehouse code already exists in your organization.");

        }

        // creating warehouse record using warehouse dao
        const warehouse = await this.warehouseDao.create({
            organizationId,
            name,
            code: code.toUpperCase(),
            address: address || "",
            status: status || "active"
        });

        return Created(res, "Warehouse created successfully", warehouse);

    }

}

export default WarehousesController;
