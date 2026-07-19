import mongoose from "mongoose";
import Receipt from "../models/receipt.model.js";
import { fromPaise, toPaise } from "../utils/money.util.js";

async function calculateInvoiceBalance({ organizationId, invoiceId, invoiceTotal, session = null }) {
    const pipeline = [
        {
            $match: {
                organizationId: new mongoose.Types.ObjectId(organizationId),
                invoiceId: new mongoose.Types.ObjectId(invoiceId),
            },
        },
        {
            $group: {
                _id: null,
                totalPaidPaise: {
                    $sum: {
                        $round: [{ $multiply: ["$amount", 100] }, 0],
                    },
                },
            },
        },
    ];

    let aggregate = Receipt.aggregate(pipeline);
    if (session) aggregate = aggregate.session(session);

    const [result] = await aggregate;
    const invoiceTotalPaise = toPaise(invoiceTotal);
    const totalPaidPaise = Math.max(0, Number(result?.totalPaidPaise || 0));
    const outstandingPaise = Math.max(invoiceTotalPaise - totalPaidPaise, 0);

    return {
        invoiceTotalPaise,
        totalPaidPaise,
        outstandingPaise,
        totalPaid: fromPaise(totalPaidPaise),
        outstandingAmount: fromPaise(outstandingPaise),
    };
}

export { calculateInvoiceBalance };
