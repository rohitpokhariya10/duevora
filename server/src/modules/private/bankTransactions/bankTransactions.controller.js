// Importing modules
import BankTransactionDao from "../../../shared/dao/bankTransaction.dao.js";
import BankAccountDao from "../../../shared/dao/bankAccount.dao.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

class BankTransactionsController {

    constructor() {
        this.bankTransactionDao = new BankTransactionDao();
        this.bankAccountDao = new BankAccountDao();
    }

    createBankTransaction = async (req, res) => {
        const { bankAccountId, transactionDate, amount, type, reference } = req.body;
        const organizationId = req.user.organizationId;

        const bankAccount = await this.bankAccountDao.findOne({ _id: bankAccountId, organizationId });
        if (!bankAccount) throw new NotFound("Bank account not found in your organization.");

        const transaction = await this.bankTransactionDao.create({
            organizationId, bankAccountId,
            transactionDate: new Date(transactionDate),
            amount, type,
            reference: reference || undefined
        });

        return Created(res, "Bank transaction recorded successfully", transaction);
    }

}

export default BankTransactionsController;
