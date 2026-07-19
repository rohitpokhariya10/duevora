// Importing modules
import QuotationDao from "../../../shared/dao/quotation.dao.js";
import CustomerDao from "../../../shared/dao/customer.dao.js";

import NotFound from "../../../shared/errors/NotFound.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Conflict from "../../../shared/errors/Conflict.error.js";

import Ok from "../../../shared/responses/Ok.response.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle quotation operations
class QuotationsController {

    constructor() {

        // initializing the quotation dao
        this.quotationDao = new QuotationDao();

        // initializing the customer dao
        this.customerDao = new CustomerDao();

    }

    // create a new quotation
    createQuotation = async (req, res) => {

        const { customerId, quotationNumber, date, expiryDate, subTotal, taxTotal, grandTotal, status } = req.body;
        const organizationId = req.user.organizationId;

        // validating customer exists in organization
        const customer = await this.customerDao.findOne({ _id: customerId, organizationId });

        if (!customer) {

            throw new NotFound("Customer not found in your organization.");

        }

        // verifying quotation number is unique within organization context
        const existing = await this.quotationDao.findOne({
            organizationId,
            quotationNumber: { $regex: new RegExp(`^${quotationNumber.trim()}$`, "i") }
        });

        if (existing) {

            throw new Conflict("Quotation number already exists in your organization.");

        }

        // creating quotation record using quotation dao
        const quotation = await this.quotationDao.create({
            organizationId, customerId,
            quotationNumber: quotationNumber.trim(),
            date: new Date(date),
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            subTotal: subTotal || 0,
            taxTotal: taxTotal || 0,
            grandTotal,
            status: status || "draft"
        });

        // returning the created quotation
        return Created(res, "Quotation created successfully", quotation);

    }

    // approve a quotation
    approveQuotation = async (req, res) => {

        const { quotationId } = req.params;
        const organizationId = req.user.organizationId;

        // finding the quotation within organization context
        const quotation = await this.quotationDao.findOne({
            _id: quotationId,
            organizationId
        });

        if (!quotation) {

            throw new NotFound("Quotation not found in your organization.");

        }

        if (quotation.status !== "draft" && quotation.status !== "sent") {

            throw new BadRequest("Only draft or sent quotations can be approved.");

        }

        // updating status of quotation to accepted
        const updatedQuotation = await this.quotationDao.updateById(quotationId, {
            status: "accepted"
        });

        // returning the approved quotation
        return Ok(res, "Quotation approved successfully", updatedQuotation);

    }

    // list all organization quotations
    listQuotations = async (req, res) => {

        const organizationId = req.user.organizationId;

        // fetching quotations
        const quotations = await this.quotationDao.find({ organizationId });

        // populating customer names
        const populated = [];

        for (const q of quotations) {

            const customer = await this.customerDao.findOne({ _id: q.customerId });
            populated.push({
                ...q.toObject(),
                partyName: customer ? customer.name : "Unknown Customer"
            });

        }

        return Ok(res, "Quotations retrieved successfully", populated);

    }

}

export default QuotationsController;
