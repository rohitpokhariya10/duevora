// Importing modules
import AccountDao from "../../../shared/dao/account.dao.js";

import Conflict from "../../../shared/errors/Conflict.error.js";

import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle account operations
class AccountsController {

    constructor() {

        // initializing the account dao
        this.accountDao = new AccountDao();

    }

    // create a new account
    createAccount = async (req, res) => {

        const { name, code, type, status } = req.body;
        const organizationId = req.user.organizationId;

        // formatting code to uppercase
        const formattedCode = code.trim().toUpperCase();

        // verifying account code is unique within organization context
        const existingAccount = await this.accountDao.findOne({
            organizationId,
            code: formattedCode
        });

        if (existingAccount) {

            throw new Conflict("Account code already exists in your organization.");

        }

        // creating account record using account dao
        const account = await this.accountDao.create({
            organizationId,
            name: name.trim(),
            code: formattedCode,
            type,
            status: status || "active"
        });

        // returning the created account
        return Created(res, "Account created successfully", account);

    }

    // list all accounts
    listAccounts = async (req, res) => {

        const organizationId = req.user.organizationId;

        // retrieving all accounts for this organization
        const accounts = await this.accountDao.find({ organizationId }, { sort: { code: 1 } });

        // returning the list of accounts
        return Ok(res, "Accounts retrieved successfully", accounts);

    }

}

export default AccountsController;
