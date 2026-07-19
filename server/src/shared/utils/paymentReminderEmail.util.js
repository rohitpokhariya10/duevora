import escapeHtml from "./escapeHtml.util.js";

const SUPPORTED_PAYMENT_PROTOCOLS = new Set(["https:", "http:"]);

function requireInlineText(value, fieldName) {
    if (value === null || value === undefined || String(value).trim().length === 0) {
        throw new Error(`${fieldName} is required to build a payment reminder`);
    }

    return String(value).trim().replace(/[\r\n\t]+/g, " ");
}

function validatePaymentUrl(value) {
    let paymentUrl;

    try {
        paymentUrl = new URL(requireInlineText(value, "Payment URL"));
    } catch {
        throw new Error("Payment URL is invalid");
    }

    if (!SUPPORTED_PAYMENT_PROTOCOLS.has(paymentUrl.protocol) || paymentUrl.username || paymentUrl.password) {
        throw new Error("Payment URL is invalid");
    }

    return paymentUrl.href;
}

function formatDate(value, fieldName, required = true) {
    if (value === null || value === undefined || value === "") {
        if (required) {
            throw new Error(`${fieldName} is required to build a payment reminder`);
        }

        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`${fieldName} is invalid`);
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatCurrency(value, currency = "INR") {
    const amount = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Payment reminder amount is invalid");
    }

    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        throw new Error("Payment reminder currency is invalid");
    }
}

function resolveDetails(details = {}) {
    const organization = details.organization ?? {};
    const customer = details.customer ?? {};
    const invoice = details.invoice ?? {};

    return {
        organizationName: requireInlineText(details.organizationName ?? organization.name, "Organization name"),
        customerName: requireInlineText(details.customerName ?? customer.name, "Customer name"),
        invoiceNumber: requireInlineText(details.invoiceNumber ?? invoice.invoiceNumber, "Invoice number"),
        invoiceDate: formatDate(details.invoiceDate ?? invoice.invoiceDate, "Invoice date", false),
        dueDate: formatDate(details.dueDate ?? invoice.dueDate, "Due date"),
        totalAmount: formatCurrency(details.totalAmount ?? invoice.grandTotal, details.currency ?? "INR"),
        amountPaid: formatCurrency(details.amountPaid ?? 0, details.currency ?? "INR"),
        outstandingAmount: formatCurrency(details.outstandingAmount, details.currency ?? "INR"),
        paymentUrl: validatePaymentUrl(details.paymentUrl),
        supportEmail: details.supportEmail ?? organization.email ?? null,
    };
}

function buildPaymentReminderEmail(details) {
    const values = resolveDetails(details);
    const subject = `Payment Reminder: Invoice ${values.invoiceNumber} from ${values.organizationName}`;
    const safe = {
        organizationName: escapeHtml(values.organizationName),
        customerName: escapeHtml(values.customerName),
        invoiceNumber: escapeHtml(values.invoiceNumber),
        invoiceDate: escapeHtml(values.invoiceDate),
        dueDate: escapeHtml(values.dueDate),
        totalAmount: escapeHtml(values.totalAmount),
        amountPaid: escapeHtml(values.amountPaid),
        outstandingAmount: escapeHtml(values.outstandingAmount),
        paymentUrl: escapeHtml(values.paymentUrl),
        supportEmail: escapeHtml(values.supportEmail),
    };
    const supportHtml = values.supportEmail
        ? `For assistance, contact <a href="mailto:${safe.supportEmail}" style="color:#1d4ed8;">${safe.supportEmail}</a>.`
        : `For assistance, contact ${safe.organizationName} through your usual support channel.`;
    const supportText = values.supportEmail
        ? `For assistance, contact ${requireInlineText(values.supportEmail, "Support email")}.`
        : `For assistance, contact ${values.organizationName} through your usual support channel.`;
    const invoiceDateRow = values.invoiceDate
        ? `<tr><td style="padding:8px 0;color:#64748b;">Invoice date</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">${safe.invoiceDate}</td></tr>`
        : "";

    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
<tr><td style="padding:24px 32px;background:#0f172a;color:#ffffff;"><div style="font-size:24px;font-weight:700;letter-spacing:.3px;">Duevora</div><div style="margin-top:4px;color:#cbd5e1;font-size:13px;">Secure payment reminder</div></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hello ${safe.customerName},</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#334155;">This is a friendly payment reminder from <strong>${safe.organizationName}</strong> for invoice <strong>${safe.invoiceNumber}</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 26px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:14px;">
${invoiceDateRow}
<tr><td style="padding:8px 0;color:#64748b;">Due date</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">${safe.dueDate}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Invoice total</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">${safe.totalAmount}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Amount paid</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">${safe.amountPaid}</td></tr>
<tr><td style="padding:12px 0;color:#0f172a;font-weight:700;">Outstanding amount</td><td style="padding:12px 0;text-align:right;color:#b45309;font-size:18px;font-weight:700;">${safe.outstandingAmount}</td></tr>
</table>
<div style="text-align:center;margin:0 0 24px;"><a href="${safe.paymentUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:13px 28px;border-radius:8px;">Pay Now</a></div>
<p style="margin:0 0 22px;font-size:12px;line-height:1.6;color:#64748b;word-break:break-all;">If the button does not work, copy this secure payment link into your browser:<br><a href="${safe.paymentUrl}" style="color:#2563eb;">${safe.paymentUrl}</a></p>
<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#475569;">${supportHtml}</p>
<p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">This is an automated reminder. If you have already completed the payment, no further action is needed.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const invoiceDateText = values.invoiceDate ? `Invoice date: ${values.invoiceDate}\n` : "";
    const text = `Hello ${values.customerName},

This is a friendly payment reminder from ${values.organizationName} for invoice ${values.invoiceNumber}.

${invoiceDateText}Due date: ${values.dueDate}
Invoice total: ${values.totalAmount}
Amount paid: ${values.amountPaid}
Outstanding amount: ${values.outstandingAmount}

Pay securely: ${values.paymentUrl}

${supportText}

This is an automated reminder. If you have already completed the payment, no further action is needed.`;

    return { subject, html, text };
}

export { buildPaymentReminderEmail, formatCurrency, formatDate, validatePaymentUrl };
export default buildPaymentReminderEmail;
