// Importing modules
import AccountDao from "../dao/account.dao.js";
import CustomerDao from "../dao/customer.dao.js";
import InvoiceDao from "../dao/invoice.dao.js";
import JournalEntryDao from "../dao/journalEntry.dao.js";
import JournalEntryLineDao from "../dao/journalEntryLine.dao.js";
import LedgerEntryDao from "../dao/ledgerEntry.dao.js";
import ReceiptDao from "../dao/receipt.dao.js";

import BadRequest from "../errors/BadRequest.error.js";
import Conflict from "../errors/Conflict.error.js";
import NotFound from "../errors/NotFound.error.js";

import { fromPaise, toPaise } from "../utils/money.util.js";
import { calculateInvoiceBalance } from "./invoiceBalance.service.js";

const accountDao = new AccountDao();
const customerDao = new CustomerDao();
const invoiceDao = new InvoiceDao();
const journalEntryDao = new JournalEntryDao();
const journalEntryLineDao = new JournalEntryLineDao();
const ledgerEntryDao = new LedgerEntryDao();
const receiptDao = new ReceiptDao();

const escapeRegularExpression = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeRequiredString = (value, fieldName) => {

    if (typeof value !== "string" || !value.trim()) {

        throw new BadRequest(`${fieldName} is required.`);

    }

    return value.trim();

};

const normalizeOptionalString = (value, fieldName) => {

    if (value === undefined || value === null || value === "") {

        return undefined;

    }

    if (typeof value !== "string" || !value.trim()) {

        throw new BadRequest(`${fieldName} must be a non-empty string.`);

    }

    return value.trim();

};

const idsMatch = (first, second) => {

    const firstId = first?._id || first;
    const secondId = second?._id || second;

    return firstId?.toString() === secondId?.toString();

};

const getOrCreateAccount = async (organizationId, name, code, type, session) => {

    return await accountDao.Model.findOneAndUpdate({
        organizationId,
        code
    }, {
        $setOnInsert: {
            organizationId,
            name,
            code,
            type,
            status: "active"
        }
    }, {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session
    });

};

const getInvoicePaymentSummary = async (organizationId, invoice, session) => {

    const paymentSummary = await calculateInvoiceBalance({
        organizationId,
        invoiceId: invoice._id,
        invoiceTotal: invoice.grandTotal,
        session
    });

    // A paid invoice is terminal because delayed provider events may arrive out of order.
    if (invoice.status !== "paid") {

        if (paymentSummary.totalPaidPaise >= paymentSummary.invoiceTotalPaise) {

            invoice.status = "paid";

        } else if (paymentSummary.totalPaidPaise > 0) {

            invoice.status = "partially_paid";

        }

        await invoice.save({ session });

    }

    return {
        totalPaid: paymentSummary.totalPaid,
        outstandingAmount: paymentSummary.outstandingAmount
    };

};

const validateIdempotentReceipt = ({
    receipt,
    organizationId,
    customerId,
    invoiceId,
    accountId,
    amountPaise,
    providerPaymentLinkId,
    providerOrderId
}) => {

    const referencesMatch = idsMatch(receipt.organizationId, organizationId)
        && idsMatch(receipt.customerId, customerId)
        && idsMatch(receipt.invoiceId, invoiceId)
        && idsMatch(receipt.accountId, accountId);
    const providerReferencesMatch = (!providerPaymentLinkId
        || receipt.providerPaymentLinkId === providerPaymentLinkId)
        && (!providerOrderId || receipt.providerOrderId === providerOrderId);

    if (!referencesMatch
        || !providerReferencesMatch
        || toPaise(receipt.amount) !== amountPaise) {

        throw new Conflict("Provider payment ID is already linked to another receipt.");

    }

};

/**
 * Records an incoming customer payment using a transaction owned by the caller.
 * The caller controls commit and rollback so the webhook can update related state atomically.
 */
const recordCustomerReceipt = async ({
    organizationId,
    customerId,
    invoiceId,
    receiptNumber,
    receiptDate,
    amount,
    paymentMethod,
    accountId,
    provider = "manual",
    providerPaymentId,
    providerPaymentLinkId,
    providerOrderId,
    session
}) => {

    if (!session) {

        throw new BadRequest("An active database session is required to record a receipt.");

    }

    if (!organizationId) {

        throw new BadRequest("Organization reference is required.");

    }

    if (!accountId) {

        throw new BadRequest("Account reference is required.");

    }

    const normalizedProvider = normalizeRequiredString(provider, "Receipt provider").toLowerCase();

    if (!["manual", "razorpay"].includes(normalizedProvider)) {

        throw new BadRequest("Receipt provider must be manual or razorpay.");

    }

    const normalizedProviderPaymentId = normalizeOptionalString(providerPaymentId, "Provider payment ID");
    const normalizedProviderPaymentLinkId = normalizeOptionalString(providerPaymentLinkId, "Provider payment link ID");
    const normalizedProviderOrderId = normalizeOptionalString(providerOrderId, "Provider order ID");

    if (normalizedProvider === "razorpay" && !normalizedProviderPaymentId) {

        throw new BadRequest("Provider payment ID is required for Razorpay receipts.");

    }

    if (normalizedProvider === "razorpay" && (!customerId || !invoiceId)) {

        throw new BadRequest("Customer and invoice references are required for Razorpay receipts.");

    }

    const normalizedReceiptNumber = normalizedProvider === "razorpay"
        ? `RZP-${normalizedProviderPaymentId}`
        : normalizeRequiredString(receiptNumber, "Receipt number");
    const normalizedPaymentMethod = normalizeRequiredString(paymentMethod, "Payment method");
    const normalizedReceiptDate = new Date(receiptDate);
    const numericAmount = typeof amount === "number" ? amount : Number(amount);
    const amountPaise = toPaise(numericAmount);

    if (Number.isNaN(normalizedReceiptDate.getTime())) {

        throw new BadRequest("Receipt date must be a valid date.");

    }

    if (amountPaise <= 0) {

        throw new BadRequest("Receipt amount must be greater than zero.");

    }

    const normalizedAmount = fromPaise(amountPaise);

    // Every referenced record is resolved in the tenant boundary before accounting writes begin.
    let customer = null;

    if (customerId) {

        customer = await customerDao.findOne({
            _id: customerId,
            organizationId
        }, session);

        if (!customer) {

            throw new NotFound("Customer reference not found in your organization.");

        }

    }

    let invoice = null;

    if (invoiceId) {

        invoice = await invoiceDao.findOne({
            _id: invoiceId,
            organizationId
        }, session);

        if (!invoice) {

            throw new NotFound("Invoice reference not found in your organization.");

        }

    }

    if (customer && invoice && !idsMatch(invoice.customerId, customer._id)) {

        throw new BadRequest("Invoice does not belong to the selected customer.");

    }

    const receivingAccount = await accountDao.findOne({
        _id: accountId,
        organizationId
    }, session);

    if (!receivingAccount) {

        throw new NotFound("Bank/Cash account not found in your organization.");

    }

    // Provider payment IDs are a second idempotency boundary after webhook event IDs.
    if (normalizedProviderPaymentId) {

        const existingProviderReceipt = await receiptDao.findOne({
            providerPaymentId: normalizedProviderPaymentId
        }, session);

        if (existingProviderReceipt) {

            validateIdempotentReceipt({
                receipt: existingProviderReceipt,
                organizationId,
                customerId,
                invoiceId,
                accountId,
                amountPaise,
                providerPaymentLinkId: normalizedProviderPaymentLinkId,
                providerOrderId: normalizedProviderOrderId
            });

            const paymentSummary = invoice
                ? await getInvoicePaymentSummary(organizationId, invoice, session)
                : { totalPaid: normalizedAmount, outstandingAmount: null };

            return {
                receipt: existingProviderReceipt,
                invoice,
                ...paymentSummary
            };

        }

    }

    const existingReceiptNumber = await receiptDao.findOne({
        organizationId,
        receiptNumber: {
            $regex: new RegExp(`^${escapeRegularExpression(normalizedReceiptNumber)}$`, "i")
        }
    }, session);

    if (existingReceiptNumber) {

        throw new Conflict("Receipt number already exists in your organization.");

    }

    const accountsReceivable = await getOrCreateAccount(
        organizationId,
        "Accounts Receivable",
        "ACCOUNTS_RECEIVABLE",
        "asset",
        session
    );

    // Creating the receipt first claims its unique provider ID before accounting rows are written.
    const receipt = await receiptDao.create({
        organizationId,
        customerId: customerId || undefined,
        invoiceId: invoiceId || undefined,
        receiptNumber: normalizedReceiptNumber,
        receiptDate: normalizedReceiptDate,
        amount: normalizedAmount,
        paymentMethod: normalizedPaymentMethod,
        accountId,
        provider: normalizedProvider,
        providerPaymentId: normalizedProviderPaymentId,
        providerPaymentLinkId: normalizedProviderPaymentLinkId,
        providerOrderId: normalizedProviderOrderId
    }, session);

    const journalEntry = await journalEntryDao.create({
        organizationId,
        entryNumber: `JE-REC-${normalizedReceiptNumber}-${Date.now()}`,
        date: normalizedReceiptDate,
        narration: `Customer payment receipt ${normalizedReceiptNumber}`,
        status: "posted"
    }, session);

    // Customer receipts always produce one debit and one balancing receivables credit.
    await journalEntryLineDao.create({
        journalEntryId: journalEntry._id,
        accountId: receivingAccount._id,
        debit: normalizedAmount,
        credit: 0
    }, session);

    await ledgerEntryDao.create({
        organizationId,
        accountId: receivingAccount._id,
        journalEntryId: journalEntry._id,
        date: normalizedReceiptDate,
        debit: normalizedAmount,
        credit: 0
    }, session);

    await journalEntryLineDao.create({
        journalEntryId: journalEntry._id,
        accountId: accountsReceivable._id,
        debit: 0,
        credit: normalizedAmount
    }, session);

    await ledgerEntryDao.create({
        organizationId,
        accountId: accountsReceivable._id,
        journalEntryId: journalEntry._id,
        date: normalizedReceiptDate,
        debit: 0,
        credit: normalizedAmount
    }, session);

    const paymentSummary = invoice
        ? await getInvoicePaymentSummary(organizationId, invoice, session)
        : { totalPaid: normalizedAmount, outstandingAmount: null };

    return {
        receipt,
        invoice,
        ...paymentSummary
    };

};

export { recordCustomerReceipt };
export default recordCustomerReceipt;
