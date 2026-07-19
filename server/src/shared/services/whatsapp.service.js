import env from "../config/env.config.js";
import normalizePhoneNumber from "../utils/phone.util.js";
import { formatCurrency, formatDate, validatePaymentUrl } from "../utils/paymentReminderEmail.util.js";

const WHATSAPP_CLOUD_PROVIDER = "whatsapp_cloud";
const WHATSAPP_DEEPLINK_PROVIDER = "whatsapp_deeplink";
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

function requireInlineText(value, fieldName) {
    if (value === null || value === undefined || String(value).trim().length === 0) {
        throw new Error(`${fieldName} is required for WhatsApp delivery`);
    }

    return String(value).trim().replace(/[\r\n\t]+/g, " ");
}

function resolveReminderDetails(details = {}, config = env) {
    const organization = details.organization ?? {};
    const customer = details.customer ?? {};
    const invoice = details.invoice ?? {};

    return {
        phone: normalizePhoneNumber(
            details.phone ?? details.customerPhone ?? customer.phone,
            config.WHATSAPP_DEFAULT_COUNTRY_CODE
        ),
        customerName: requireInlineText(details.customerName ?? customer.name, "Customer name"),
        organizationName: requireInlineText(details.organizationName ?? organization.name, "Organization name"),
        invoiceNumber: requireInlineText(details.invoiceNumber ?? invoice.invoiceNumber, "Invoice number"),
        outstandingAmount: formatCurrency(details.outstandingAmount, details.currency ?? "INR"),
        dueDate: formatDate(details.dueDate ?? invoice.dueDate, "Due date"),
        paymentUrl: validatePaymentUrl(details.paymentUrl),
    };
}

function buildWhatsAppMessage(details, config = env) {
    const values = resolveReminderDetails(details, config);
    const message = `Hello ${values.customerName}, this is a friendly payment reminder from ${values.organizationName} for invoice ${values.invoiceNumber}. The outstanding amount is ${values.outstandingAmount}, due on ${values.dueDate}. Please pay securely using ${values.paymentUrl}. If you need assistance, please contact ${values.organizationName} through your usual support channel.`;

    return { message, phone: values.phone };
}

function buildWhatsAppDeeplink(details, config = env) {
    const { message, phone } = buildWhatsAppMessage(details, config);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function failedResult(error, retryable = false) {
    return {
        status: "failed",
        mode: "cloud",
        provider: WHATSAPP_CLOUD_PROVIDER,
        error,
        retryable,
        requiresSellerAction: false,
    };
}

function hasCloudConfiguration(config) {
    return [
        config.WHATSAPP_API_VERSION,
        config.WHATSAPP_PHONE_NUMBER_ID,
        config.WHATSAPP_ACCESS_TOKEN,
        config.WHATSAPP_TEMPLATE_NAME,
        config.WHATSAPP_TEMPLATE_LANGUAGE,
    ].every((value) => typeof value === "string" && value.trim().length > 0);
}

async function sendCloudTemplate(details, options) {
    const { config, fetchImpl, timeoutMs } = options;

    if (!hasCloudConfiguration(config)) {
        return failedResult("WhatsApp Cloud is not configured");
    }

    if (typeof fetchImpl !== "function") {
        return failedResult("WhatsApp Cloud transport is unavailable", true);
    }

    let values;

    try {
        values = resolveReminderDetails(details, config);
    } catch {
        return failedResult("WhatsApp reminder details are invalid");
    }

    const requestBody = {
        messaging_product: "whatsapp",
        to: values.phone,
        type: "template",
        template: {
            name: config.WHATSAPP_TEMPLATE_NAME,
            language: {
                code: config.WHATSAPP_TEMPLATE_LANGUAGE,
            },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: values.customerName },
                        { type: "text", text: values.organizationName },
                        { type: "text", text: values.invoiceNumber },
                        { type: "text", text: values.outstandingAmount },
                        { type: "text", text: values.dueDate },
                        { type: "text", text: values.paymentUrl },
                    ],
                },
            ],
        },
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const apiVersion = encodeURIComponent(config.WHATSAPP_API_VERSION.trim());
        const phoneNumberId = encodeURIComponent(config.WHATSAPP_PHONE_NUMBER_ID.trim());
        const response = await fetchImpl(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        let responseBody = null;

        try {
            responseBody = await response.json();
        } catch {
            responseBody = null;
        }

        if (!response.ok) {
            return failedResult(
                "WhatsApp Cloud rejected the message",
                response.status === 408 || response.status === 429 || response.status >= 500
            );
        }

        const providerMessageId = responseBody?.messages?.[0]?.id;

        if (typeof providerMessageId !== "string" || providerMessageId.length === 0) {
            return failedResult("WhatsApp Cloud returned an invalid response", true);
        }

        // Only the provider message ID crosses the service boundary; response payloads may contain PII.
        return {
            status: "sent",
            mode: "cloud",
            provider: WHATSAPP_CLOUD_PROVIDER,
            providerMessageId,
            retryable: false,
            requiresSellerAction: false,
        };
    } catch {
        return failedResult("WhatsApp Cloud request failed", true);
    } finally {
        clearTimeout(timeout);
    }
}

async function sendWhatsAppReminder(details, options = {}) {
    const config = options.config ?? env;
    const mode = options.mode ?? config.WHATSAPP_MODE;

    if (mode === "disabled") {
        return {
            status: "skipped",
            mode,
            provider: null,
            skipped: true,
            retryable: false,
            requiresSellerAction: false,
        };
    }

    if (mode === "deeplink") {
        try {
            return {
                status: "link_generated",
                mode,
                provider: WHATSAPP_DEEPLINK_PROVIDER,
                deeplink: buildWhatsAppDeeplink(details, config),
                deliveryConfirmed: false,
                retryable: false,
                requiresSellerAction: true,
            };
        } catch {
            return {
                status: "failed",
                mode,
                provider: WHATSAPP_DEEPLINK_PROVIDER,
                error: "WhatsApp reminder details are invalid",
                retryable: false,
                requiresSellerAction: false,
            };
        }
    }

    if (mode === "cloud") {
        return sendCloudTemplate(details, {
            config,
            fetchImpl: options.fetchImpl ?? globalThis.fetch,
            timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
        });
    }

    return {
        status: "failed",
        mode,
        provider: null,
        error: "WhatsApp mode is invalid",
        retryable: false,
        requiresSellerAction: false,
    };
}

class WhatsAppService {
    constructor(options = {}) {
        this.config = options.config ?? env;
        this.fetchImpl = options.fetchImpl;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    }

    async sendReminder(details) {
        return sendWhatsAppReminder(details, {
            config: this.config,
            fetchImpl: this.fetchImpl ?? globalThis.fetch,
            timeoutMs: this.timeoutMs,
        });
    }
}

const whatsappService = new WhatsAppService();

export {
    DEFAULT_REQUEST_TIMEOUT_MS,
    WHATSAPP_CLOUD_PROVIDER,
    WHATSAPP_DEEPLINK_PROVIDER,
    WhatsAppService,
    buildWhatsAppDeeplink,
    buildWhatsAppMessage,
    sendWhatsAppReminder,
};
export default whatsappService;
