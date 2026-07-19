// Importing modules
import mongoose from "mongoose";
import { recordCustomerReceipt } from "../../../shared/services/customerReceipt.service.js";

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

        try {

            const { receipt } = await recordCustomerReceipt({
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

            // returning the created receipt
            return Created(res, "Receipt recorded successfully", receipt);

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

    }

}

export default ReceiptsController;
