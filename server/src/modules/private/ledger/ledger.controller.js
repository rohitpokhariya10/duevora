// Importing modules
import LedgerEntryDao from "../../../shared/dao/ledgerEntry.dao.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle ledger operations
class LedgerController {

    constructor() {

        // initializing the ledger entry dao
        this.ledgerEntryDao = new LedgerEntryDao();

    }

    // list ledger entries
    getLedger = async (req, res) => {

        const { accountId, startDate, endDate } = req.query;
        const organizationId = req.user.organizationId;

        // parsing pagination parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // building filters
        const filter = {
            organizationId
        };

        if (accountId) {

            filter.accountId = accountId;

        }

        if (startDate || endDate) {

            filter.date = {};

            if (startDate) {

                filter.date.$gte = new Date(startDate);

            }

            if (endDate) {

                filter.date.$lte = new Date(endDate);

            }

        }

        // fetching total count for pagination metadata
        const total = await this.ledgerEntryDao.Model.countDocuments(filter);

        // fetching ledger entries
        const entries = await this.ledgerEntryDao.find(filter, {
            sort: {
                date: -1
            },
            limit,
            skip
        });

        // formatting response metadata
        const data = {
            entries,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };

        return Ok(res, "Ledger entries retrieved successfully", data);

    }

}

export default LedgerController;
