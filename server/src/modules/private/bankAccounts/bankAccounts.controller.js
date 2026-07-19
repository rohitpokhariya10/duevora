// Importing modules
import BankAccountDao from "../../../shared/dao/bankAccount.dao.js";
import AccountDao from "../../../shared/dao/account.dao.js";

import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";

import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle bank account operations
class BankAccountsController {

    constructor() {

        // initializing the bankAccount dao
        this.bankAccountDao = new BankAccountDao();

        // initializing the account dao
        this.accountDao = new AccountDao();

    }

    // create a new bank account
    createBankAccount = async (req, res) => {

        const { bankName, accountNumber, ifscCode, branch, accountId } = req.body;
        const organizationId = req.user.organizationId;

        // validating account exists in organization
        const account = await this.accountDao.findOne({ _id: accountId, organizationId });

        if (!account) {

            throw new NotFound("Account reference not found in your organization.");

        }

        // checking uniqueness of account number within organization
        const existing = await this.bankAccountDao.findOne({ organizationId, accountNumber: accountNumber.trim() });

        if (existing) {

            throw new Conflict("A bank account with this account number already exists in your organization.");

        }

        // creating the bank account record using bank account dao
        const bankAccount = await this.bankAccountDao.create({
            organizationId,
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode ? ifscCode.trim() : undefined,
            branch: branch ? branch.trim() : undefined,
            accountId
        });

        // returning the created bank account
        return Created(res, "Bank account created successfully", bankAccount);

    }

    // list all bank accounts
    listBankAccounts = async (req, res) => {

        const organizationId = req.user.organizationId;

        // retrieving bank accounts
        const bankAccounts = await this.bankAccountDao.find({ organizationId });

        // returning bank accounts
        return Ok(res, "Bank accounts retrieved successfully", bankAccounts);

    }

}

export default BankAccountsController;
