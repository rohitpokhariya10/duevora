// Importing modules
import mongoose from "mongoose";
import { recordCustomerReceipt } from "../../../shared/services/customerReceipt.service.js";
import paymentLinkService from "../../../shared/services/paymentLink.service.js";
import { completePaidInvoiceReminders } from "../../../shared/services/reminder.service.js";
import logger from "../../../shared/config/logger.config.js";

import Created from "../../../shared/responses/Created.response.js";

// class to handle receipt operations
class ReceiptsController {

    // create a new receipt
    createReceipt = async (req, res) => {

        const { customerId, invoiceId, receiptNumber, receiptDate, amount, paymentMethod, accountId } = req.body;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();
        let receiptResult;

        try {

            receiptResult = await recordCustomerReceipt({
                organizationId,
                customerId,
                invoiceId,
                receiptNumber,
                receiptDate,
                amount,
                paymentMethod,
                accountId,
                provider: "manual",
                session
            });

            // committing transaction
            await session.commitTransaction();

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

        const postCommitOperations = [];

        if (invoiceId) {
            postCommitOperations.push(
                paymentLinkService.reconcileAfterReceipt({ organizationId, invoiceId })
            );

            if (receiptResult.invoice?.status === "paid") {
                postCommitOperations.push(
                    completePaidInvoiceReminders({ organizationId, invoiceId })
                );
            }
        }

        // Payment-link cancellation and Redis cleanup must run only after the
        // receipt/accounting transaction has committed.
        const lifecycleResults = await Promise.allSettled(postCommitOperations);
        lifecycleResults.forEach((result, index) => {
            if (result.status === "rejected") {
                logger.warn({
                    operation: index === 0 ? "reconcile_payment_link" : "complete_paid_reminders",
                    invoiceId: invoiceId?.toString(),
                    errorName: result.reason?.name,
                }, "Post-receipt payment lifecycle operation failed");
            }
        });

        // returning the created receipt
        return Created(res, "Receipt recorded successfully", receiptResult.receipt);

    }

}

export default ReceiptsController;
