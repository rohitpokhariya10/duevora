// Importing modules
import mongoose from "mongoose";
import ExpenseDao from "../../../shared/dao/expense.dao.js";
import CategoryDao from "../../../shared/dao/category.dao.js";
import AccountDao from "../../../shared/dao/account.dao.js";
import JournalEntryDao from "../../../shared/dao/journalEntry.dao.js";
import JournalEntryLineDao from "../../../shared/dao/journalEntryLine.dao.js";
import LedgerEntryDao from "../../../shared/dao/ledgerEntry.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle expense operations
class ExpensesController {

    constructor() {

        // initializing the daos
        this.expenseDao = new ExpenseDao();
        this.categoryDao = new CategoryDao();
        this.accountDao = new AccountDao();
        this.journalEntryDao = new JournalEntryDao();
        this.journalEntryLineDao = new JournalEntryLineDao();
        this.ledgerEntryDao = new LedgerEntryDao();

    }

    // create a new expense
    createExpense = async (req, res) => {

        const { expenseNumber, date, amount, categoryId, accountId, description } = req.body;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // validating category exists in organization if provided
            if (categoryId) {

                const category = await this.categoryDao.findOne({
                    _id: categoryId,
                    organizationId
                }, session);

                if (!category) {

                    throw new NotFound("Category reference not found in your organization.");

                }

            }

            // validating credit bank/cash account exists in organization context
            const bankAccount = await this.accountDao.findOne({
                _id: accountId,
                organizationId
            }, session);

            if (!bankAccount) {

                throw new NotFound("Bank/Cash account reference not found in your organization.");

            }

            // verifying expense number is unique within organization context
            const existingExpense = await this.expenseDao.findOne({
                organizationId,
                expenseNumber: {
                    $regex: new RegExp(`^${expenseNumber.trim()}$`, "i")
                }
            }, session);

            if (existingExpense) {

                throw new Conflict("Expense number already exists in your organization.");

            }

            // getting or creating Expense debit account
            const expenseAccount = await this.getOrCreateAccount(
                organizationId,
                "Expense Account",
                "EXPENSE",
                "expense",
                session
            );

            // creating a journal entry
            const journalEntry = await this.journalEntryDao.create({
                organizationId,
                entryNumber: `JE-EXP-${expenseNumber.trim()}-${Date.now()}`,
                date: new Date(date),
                narration: description || `Expense record ${expenseNumber.trim()}`,
                status: "posted"
            }, session);

            // creating journal entry lines and ledger entries
            // 1. Expense Account debit
            await this.journalEntryLineDao.create({
                journalEntryId: journalEntry._id,
                accountId: expenseAccount._id,
                debit: amount,
                credit: 0
            }, session);

            await this.ledgerEntryDao.create({
                organizationId,
                accountId: expenseAccount._id,
                journalEntryId: journalEntry._id,
                date: new Date(date),
                debit: amount,
                credit: 0
            }, session);

            // 2. Bank/Cash credit
            await this.journalEntryLineDao.create({
                journalEntryId: journalEntry._id,
                accountId: bankAccount._id,
                debit: 0,
                credit: amount
            }, session);

            await this.ledgerEntryDao.create({
                organizationId,
                accountId: bankAccount._id,
                journalEntryId: journalEntry._id,
                date: new Date(date),
                debit: 0,
                credit: amount
            }, session);

            // creating expense record using expense dao
            const expense = await this.expenseDao.create({
                organizationId,
                expenseNumber: expenseNumber.trim(),
                date: new Date(date),
                amount,
                categoryId: categoryId || undefined,
                accountId,
                description
            }, session);

            // committing transaction
            await session.commitTransaction();

            return Created(res, "Expense recorded successfully", expense);

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

    }

    // helper to get or create account
    getOrCreateAccount = async (organizationId, name, code, type, session) => {

        let account = await this.accountDao.Model.findOne({
            organizationId,
            code
        }).session(session);

        if (!account) {

            account = new this.accountDao.Model({
                organizationId,
                name,
                code,
                type,
                status: "active"
            });

            await account.save({ session });

        }

        return account;

    }

}

export default ExpensesController;
