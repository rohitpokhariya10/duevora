import LedgerEntryDao from "../../../shared/dao/ledgerEntry.dao.js";
import AccountDao from "../../../shared/dao/account.dao.js";
import Ok from "../../../shared/responses/Ok.response.js";
import mongoose from "mongoose";

class ReportsController {
    constructor() {
        this.ledgerEntryDao = new LedgerEntryDao();
        this.accountDao = new AccountDao();
    }

    // GET /api/reports/trial-balance
    // Aggregates total debit and credit per account
    trialBalance = async (req, res) => {
        const organizationId = new mongoose.Types.ObjectId(req.user.organizationId);

        const rows = await this.ledgerEntryDao.Model.aggregate([
            { $match: { organizationId } },
            { $group: { _id: "$accountId", totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } },
            { $lookup: { from: "accounts", localField: "_id", foreignField: "_id", as: "account" } },
            { $unwind: "$account" },
            { $project: { accountId: "$_id", accountName: "$account.name", accountCode: "$account.code", accountType: "$account.type", totalDebit: 1, totalCredit: 1, _id: 0 } },
            { $sort: { accountCode: 1 } }
        ]);

        const grandTotalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
        const grandTotalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);

        return Ok(res, "Trial balance retrieved successfully", { rows, grandTotalDebit, grandTotalCredit });
    }

    // GET /api/reports/profit-loss
    // Revenue minus Expenses for a given period
    profitLoss = async (req, res) => {
        const organizationId = new mongoose.Types.ObjectId(req.user.organizationId);
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const matchStage = { organizationId };
        if (startDate || endDate) matchStage.date = dateFilter;

        const rows = await this.ledgerEntryDao.Model.aggregate([
            { $match: matchStage },
            { $lookup: { from: "accounts", localField: "accountId", foreignField: "_id", as: "account" } },
            { $unwind: "$account" },
            { $match: { "account.type": { $in: ["revenue", "expense"] } } },
            { $group: { _id: { accountId: "$accountId", type: "$account.type", name: "$account.name", code: "$account.code" }, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } },
            { $project: { accountId: "$_id.accountId", name: "$_id.name", code: "$_id.code", type: "$_id.type", totalDebit: 1, totalCredit: 1, _id: 0 } }
        ]);

        const revenue = rows.filter(r => r.type === "revenue").reduce((s, r) => s + (r.totalCredit - r.totalDebit), 0);
        const expenses = rows.filter(r => r.type === "expense").reduce((s, r) => s + (r.totalDebit - r.totalCredit), 0);
        const netProfit = revenue - expenses;

        return Ok(res, "Profit & Loss retrieved successfully", { rows, revenue, expenses, netProfit });
    }

    // GET /api/reports/balance-sheet
    // Assets = Liabilities + Equity
    balanceSheet = async (req, res) => {
        const organizationId = new mongoose.Types.ObjectId(req.user.organizationId);

        const rows = await this.ledgerEntryDao.Model.aggregate([
            { $match: { organizationId } },
            { $group: { _id: "$accountId", totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } },
            { $lookup: { from: "accounts", localField: "_id", foreignField: "_id", as: "account" } },
            { $unwind: "$account" },
            { $match: { "account.type": { $in: ["asset", "liability", "equity"] } } },
            { $project: { accountId: "$_id", name: "$account.name", code: "$account.code", type: "$account.type", balance: { $subtract: ["$totalDebit", "$totalCredit"] }, _id: 0 } }
        ]);

        const assets = rows.filter(r => r.type === "asset").reduce((s, r) => s + r.balance, 0);
        const liabilities = rows.filter(r => r.type === "liability").reduce((s, r) => s + Math.abs(r.balance), 0);
        const equity = rows.filter(r => r.type === "equity").reduce((s, r) => s + Math.abs(r.balance), 0);

        return Ok(res, "Balance sheet retrieved successfully", { rows, assets, liabilities, equity });
    }

    // GET /api/reports/cash-flow
    // Cash inflows and outflows by account type
    cashFlow = async (req, res) => {
        const organizationId = new mongoose.Types.ObjectId(req.user.organizationId);
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const matchStage = { organizationId };
        if (startDate || endDate) matchStage.date = dateFilter;

        const rows = await this.ledgerEntryDao.Model.aggregate([
            { $match: matchStage },
            { $lookup: { from: "accounts", localField: "accountId", foreignField: "_id", as: "account" } },
            { $unwind: "$account" },
            { $match: { "account.type": "asset" } },
            { $group: { _id: null, totalInflow: { $sum: "$debit" }, totalOutflow: { $sum: "$credit" } } },
            { $project: { totalInflow: 1, totalOutflow: 1, netCashFlow: { $subtract: ["$totalInflow", "$totalOutflow"] }, _id: 0 } }
        ]);

        return Ok(res, "Cash flow retrieved successfully", rows[0] || { totalInflow: 0, totalOutflow: 0, netCashFlow: 0 });
    }
}

export default ReportsController;
