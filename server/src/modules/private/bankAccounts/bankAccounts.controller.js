// Importing modules
import BankAccountDao from "../../../shared/dao/bankAccount.dao.js";
import AccountDao from "../../../shared/dao/account.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

class BankAccountsController {

    constructor() {
        this.bankAccountDao = new BankAccountDao();
        this.accountDao = new AccountDao();
    }

    createBankAccount = async (req, res) => {
        const { bankName, accountNumber, ifscCode, branch, accountId } = req.body;
        const organizationId = req.user.organizationId;

        // validate account exists in organization
        const account = await this.accountDao.findOne({ _id: accountId, organizationId });
        if (!account) {
            throw new NotFound("Account reference not found in your organization.");
        }

        // check uniqueness of account number within organization
        const existing = await this.bankAccountDao.findOne({ organizationId, accountNumber: accountNumber.trim() });
        if (existing) {
            throw new Conflict("A bank account with this account number already exists in your organization.");
        }

        const bankAccount = await this.bankAccountDao.create({
            organizationId,
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode ? ifscCode.trim() : undefined,
            branch: branch ? branch.trim() : undefined,
            accountId
        });

        return Created(res, "Bank account created successfully", bankAccount);
    }

}

export default BankAccountsController;
