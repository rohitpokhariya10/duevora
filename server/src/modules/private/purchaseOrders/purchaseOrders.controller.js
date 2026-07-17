// Importing modules
import PurchaseOrderDao from "../../../shared/dao/purchaseOrder.dao.js";
import VendorDao from "../../../shared/dao/vendor.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle purchase order operations
class PurchaseOrdersController {

    constructor() {

        // initializing the daos
        this.purchaseOrderDao = new PurchaseOrderDao();
        this.vendorDao = new VendorDao();

    }

    // create a new purchase order
    createPurchaseOrder = async (req, res) => {

        const { vendorId, poNumber, poDate, grandTotal, status } = req.body;
        const organizationId = req.user.organizationId;

        // validating referenced vendor exists in organization
        const vendor = await this.vendorDao.findOne({
            _id: vendorId,
            organizationId
        });

        if (!vendor) {

            throw new NotFound("Vendor reference not found in your organization.");

        }

        // verifying PO number is unique in organization context
        const existingPo = await this.purchaseOrderDao.findOne({
            organizationId,
            poNumber: poNumber.trim()
        });

        if (existingPo) {

            throw new Conflict("PO number already exists in your organization.");

        }

        // creating purchase order record using purchase order dao
        const po = await this.purchaseOrderDao.create({
            organizationId,
            vendorId,
            poNumber: poNumber.trim(),
            poDate: new Date(poDate),
            grandTotal,
            status: status || "draft"
        });

        return Created(res, "Purchase order created successfully", po);

    }

}

export default PurchaseOrdersController;
