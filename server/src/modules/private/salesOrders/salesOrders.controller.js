// Importing modules
import SalesOrderDao from "../../../shared/dao/salesOrder.dao.js";
import CustomerDao from "../../../shared/dao/customer.dao.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import Ok from "../../../shared/responses/Ok.response.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle sales order operations
class SalesOrdersController {

    constructor() {

        // initializing the sales order dao
        this.salesOrderDao = new SalesOrderDao();
        this.customerDao = new CustomerDao();

    }

    // create a new sales order
    createSalesOrder = async (req, res) => {

        const { customerId, orderNumber, orderDate, grandTotal, status } = req.body;
        const organizationId = req.user.organizationId;

        const customer = await this.customerDao.findOne({ _id: customerId, organizationId });
        if (!customer) throw new NotFound("Customer not found in your organization.");

        const existing = await this.salesOrderDao.findOne({
            organizationId,
            orderNumber: { $regex: new RegExp(`^${orderNumber.trim()}$`, "i") }
        });
        if (existing) throw new Conflict("Sales order number already exists in your organization.");

        const order = await this.salesOrderDao.create({
            organizationId, customerId,
            orderNumber: orderNumber.trim(),
            orderDate: new Date(orderDate),
            grandTotal, status: status || "draft"
        });

        return Created(res, "Sales order created successfully", order);

    }

    // approve a sales order
    approveSalesOrder = async (req, res) => {

        const { orderId } = req.params;
        const organizationId = req.user.organizationId;

        // finding the sales order within organization context
        const order = await this.salesOrderDao.findOne({
            _id: orderId,
            organizationId
        });

        if (!order) {

            throw new NotFound("Sales order not found in your organization.");

        }

        if (order.status !== "draft") {

            throw new BadRequest("Only draft sales orders can be approved.");

        }

        // updating status of sales order to processing (approved for fulfillment)
        const updatedOrder = await this.salesOrderDao.updateById(orderId, {
            status: "processing"
        });

        return Ok(res, "Sales order approved successfully", updatedOrder);

    }

}

export default SalesOrdersController;
