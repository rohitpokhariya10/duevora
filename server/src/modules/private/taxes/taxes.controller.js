// Importing modules
import TaxDao from "../../../shared/dao/tax.dao.js";

import Conflict from "../../../shared/errors/Conflict.error.js";

import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle tax operations
class TaxesController {

    constructor() {

        // initializing the tax dao
        this.taxDao = new TaxDao();

    }

    // create a new tax
    createTax = async (req, res) => {

        const { name, rate, code } = req.body;
        const organizationId = req.user.organizationId;

        // verifying tax code is unique within organization context
        const existingTax = await this.taxDao.findOne({
            organizationId,
            code: code.toUpperCase()
        });

        if (existingTax) {

            throw new Conflict("Tax code already exists in your organization.");

        }

        // creating tax record using tax dao
        const tax = await this.taxDao.create({
            organizationId,
            name,
            rate,
            code: code.toUpperCase()
        });

        // returning the created tax
        return Created(res, "Tax created successfully", tax);

    }

    // list all taxes
    listTaxes = async (req, res) => {

        const organizationId = req.user.organizationId;

        // retrieving taxes
        const taxes = await this.taxDao.find({ organizationId });

        // returning taxes
        return Ok(res, "Taxes retrieved successfully", taxes);

    }

}

export default TaxesController;
