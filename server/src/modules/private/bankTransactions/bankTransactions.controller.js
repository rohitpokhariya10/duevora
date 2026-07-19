// Importing modules
import BankTransactionDao from "../../../shared/dao/bankTransaction.dao.js";
import BankAccountDao from "../../../shared/dao/bankAccount.dao.js";

import NotFound from "../../../shared/errors/NotFound.error.js";

import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle bank transaction operations
class BankTransactionsController {

    constructor() {

        // initializing the bankTransaction dao
        this.bankTransactionDao = new BankTransactionDao();

        // initializing the bankAccount dao
        this.bankAccountDao = new BankAccountDao();

    }

    // create a new bank transaction
    createBankTransaction = async (req, res) => {

        const { bankAccountId, transactionDate, amount, type, reference } = req.body;
        const organizationId = req.user.organizationId;

        // validating bank account exists in organization
        const bankAccount = await this.bankAccountDao.findOne({ _id: bankAccountId, organizationId });

        if (!bankAccount) {

            throw new NotFound("Bank account not found in your organization.");

        }

        // creating the bank transaction record using bank transaction dao
        const transaction = await this.bankTransactionDao.create({
            organizationId, bankAccountId,
            transactionDate: new Date(transactionDate),
            amount, type,
            reference: reference || undefined
        });

        // returning the created transaction
        return Created(res, "Bank transaction recorded successfully", transaction);

    }

    // list all bank transactions
    listBankTransactions = async (req, res) => {

        const organizationId = req.user.organizationId;

        // retrieving bank transactions
        const bankTransactions = await this.bankTransactionDao.find({ organizationId });

        // returning bank transactions
        return Ok(res, "Bank transactions retrieved successfully", bankTransactions);

    }

}

export default BankTransactionsController;
