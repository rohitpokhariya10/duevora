// Importing modules
import FinancialYearDao from "../../../shared/dao/financialYear.dao.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

class FinancialYearsController {

    constructor() {
        this.financialYearDao = new FinancialYearDao();
    }

    createFinancialYear = async (req, res) => {
        const { name, startDate, endDate } = req.body;
        const organizationId = req.user.organizationId;

        // validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            throw new BadRequest("End date must be after start date.");
        }

        const financialYear = await this.financialYearDao.create({
            organizationId,
            name: name.trim(),
            startDate: start,
            endDate: end
        });

        return Created(res, "Financial year created successfully", financialYear);
    }

    archiveFinancialYear = async (req, res) => {
        const { fyId } = req.params;
        const organizationId = req.user.organizationId;

        // find the financial year scoped to the organization
        const financialYear = await this.financialYearDao.findOne({ _id: fyId, organizationId });

        if (!financialYear) {
            throw new NotFound("Financial year not found.");
        }

        if (financialYear.isClosed) {
            throw new BadRequest("Financial year is already archived.");
        }

        // close/archive the financial year
        const archived = await this.financialYearDao.updateById(fyId, { isClosed: true });

        return Ok(res, "Financial year archived successfully", archived);
    }

}

export default FinancialYearsController;
