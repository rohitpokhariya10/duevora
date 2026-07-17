// Importing modules
import BudgetDao from "../../../shared/dao/budget.dao.js";
import FinancialYearDao from "../../../shared/dao/financialYear.dao.js";
import AccountDao from "../../../shared/dao/account.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

class BudgetsController {

    constructor() {
        this.budgetDao = new BudgetDao();
        this.financialYearDao = new FinancialYearDao();
        this.accountDao = new AccountDao();
    }

    createBudget = async (req, res) => {
        const { financialYearId, accountId, amount } = req.body;
        const organizationId = req.user.organizationId;

        const financialYear = await this.financialYearDao.findOne({ _id: financialYearId, organizationId });
        if (!financialYear) throw new NotFound("Financial year not found in your organization.");

        const account = await this.accountDao.findOne({ _id: accountId, organizationId });
        if (!account) throw new NotFound("Account reference not found in your organization.");

        // unique constraint per financialYear + account
        const existing = await this.budgetDao.findOne({ financialYearId, accountId });
        if (existing) throw new Conflict("A budget already exists for this account in the specified financial year.");

        const budget = await this.budgetDao.create({ organizationId, financialYearId, accountId, amount });

        return Created(res, "Budget created successfully", budget);
    }

}

export default BudgetsController;
