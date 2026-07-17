// Importing modules
import OpeningBalanceDao from "../../../shared/dao/openingBalance.dao.js";
import FinancialYearDao from "../../../shared/dao/financialYear.dao.js";
import AccountDao from "../../../shared/dao/account.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

class OpeningBalancesController {

    constructor() {
        this.openingBalanceDao = new OpeningBalanceDao();
        this.financialYearDao = new FinancialYearDao();
        this.accountDao = new AccountDao();
    }

    createOpeningBalance = async (req, res) => {
        const { financialYearId, accountId, debit, credit } = req.body;
        const organizationId = req.user.organizationId;

        const financialYear = await this.financialYearDao.findOne({ _id: financialYearId, organizationId });
        if (!financialYear) throw new NotFound("Financial year not found in your organization.");

        const account = await this.accountDao.findOne({ _id: accountId, organizationId });
        if (!account) throw new NotFound("Account reference not found in your organization.");

        // unique constraint per financialYear + account
        const existing = await this.openingBalanceDao.findOne({ financialYearId, accountId });
        if (existing) throw new Conflict("An opening balance already exists for this account in the specified financial year.");

        const openingBalance = await this.openingBalanceDao.create({
            organizationId, financialYearId, accountId,
            debit: debit || 0, credit: credit || 0
        });

        return Created(res, "Opening balance created successfully", openingBalance);
    }

}

export default OpeningBalancesController;
