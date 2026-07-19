import { jest } from "@jest/globals";

const mockTransporter = {
    sendMail: jest.fn(),
};
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
};
const mockEnv = {
    SEND_MAIL: false,
    SENDING_USER: "Duevora <billing@example.com>",
    WHATSAPP_MODE: "deeplink",
    WHATSAPP_DEFAULT_COUNTRY_CODE: "91",
    WHATSAPP_API_VERSION: "v23.0",
    WHATSAPP_PHONE_NUMBER_ID: "123456789",
    WHATSAPP_ACCESS_TOKEN: "test-access-token",
    WHATSAPP_TEMPLATE_NAME: "invoice_payment_reminder",
    WHATSAPP_TEMPLATE_LANGUAGE: "en",
};

jest.unstable_mockModule("../../config/mail.config.js", () => ({
    __esModule: true,
    default: mockTransporter,
}));

jest.unstable_mockModule("../../config/logger.config.js", () => ({
    __esModule: true,
    default: mockLogger,
}));

jest.unstable_mockModule("../../config/env.config.js", () => ({
    __esModule: true,
    default: mockEnv,
}));

const { MOCK_EMAIL_MESSAGE_ID, default: sendMail } = await import("../sendMail.util.js");
const { default: buildPaymentReminderEmail } = await import("../paymentReminderEmail.util.js");
const {
    WhatsAppService,
    buildWhatsAppDeeplink,
    sendWhatsAppReminder,
} = await import("../../services/whatsapp.service.js");

const reminderDetails = {
    customerName: "Asha Customer",
    organizationName: "Acme Traders",
    invoiceNumber: "INV-2026-101",
    invoiceDate: "2026-07-01T00:00:00.000Z",
    dueDate: "2026-07-20T00:00:00.000Z",
    totalAmount: 2000,
    amountPaid: 749.5,
    outstandingAmount: 1250.5,
    paymentUrl: "https://rzp.io/rzp/example?source=reminder&safe=true",
    phone: "98765-43210",
};

beforeEach(() => {
    mockEnv.SEND_MAIL = false;
    mockTransporter.sendMail.mockReset();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
});

describe("sendMail", () => {
    it("returns a predictable result without logging PII when mail is disabled", async () => {
        const result = await sendMail("customer@example.com", "Private invoice", "<p>Private content</p>");

        expect(result).toBe(MOCK_EMAIL_MESSAGE_ID);
        expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(mockLogger.info.mock.calls)).not.toContain("customer@example.com");
        expect(JSON.stringify(mockLogger.info.mock.calls)).not.toContain("Private content");
    });

    it("awaits SMTP and supports plain text and reply-to options", async () => {
        mockEnv.SEND_MAIL = true;
        mockTransporter.sendMail.mockResolvedValue({ messageId: "smtp-message-123" });

        const result = await sendMail("customer@example.com", "Subject", "<p>Hello</p>", {
            text: "Hello",
            replyTo: "support@example.com",
        });

        expect(result).toBe("smtp-message-123");
        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
            from: mockEnv.SENDING_USER,
            to: "customer@example.com",
            subject: "Subject",
            html: "<p>Hello</p>",
            text: "Hello",
            replyTo: "support@example.com",
        });
    });

    it("keeps the existing three-argument call compatible", async () => {
        mockEnv.SEND_MAIL = true;
        mockTransporter.sendMail.mockResolvedValue({ messageId: "smtp-message-legacy" });

        await expect(sendMail("customer@example.com", "Subject", "<p>Hello</p>"))
            .resolves.toBe("smtp-message-legacy");
    });

    it("turns SMTP failures into a safe error", async () => {
        mockEnv.SEND_MAIL = true;
        mockTransporter.sendMail.mockRejectedValue(Object.assign(new Error("credential details"), { code: "EAUTH" }));

        await expect(sendMail("customer@example.com", "Subject", "<p>Hello</p>"))
            .rejects.toThrow("Email delivery failed");
        expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain("credential details");
        expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain("customer@example.com");
    });
});

describe("payment reminder email", () => {
    it("builds branded HTML and a plain-text fallback with escaped dynamic content", () => {
        const email = buildPaymentReminderEmail({
            ...reminderDetails,
            customerName: `<Asha & "Family">`,
            organizationName: "Acme <Traders>",
            supportEmail: "billing@example.com",
        });

        expect(email.subject).toContain("INV-2026-101");
        expect(email.html).toContain("Duevora");
        expect(email.html).toContain("Pay Now");
        expect(email.html).toContain("&lt;Asha &amp; &quot;Family&quot;&gt;");
        expect(email.html).not.toContain(`<Asha & "Family">`);
        expect(email.html).toContain("rzp.io/rzp/example?source=reminder&amp;safe=true");
        expect(email.text).toContain("Outstanding amount:");
        expect(email.text).toContain(reminderDetails.paymentUrl);
        expect(email.text).toContain("automated reminder");
    });

    it("rejects an unsafe payment URL", () => {
        expect(() => buildPaymentReminderEmail({
            ...reminderDetails,
            paymentUrl: "javascript:alert(1)",
        })).toThrow("Payment URL is invalid");
    });
});

describe("WhatsApp reminder delivery", () => {
    it("skips without validating details or calling fetch in disabled mode", async () => {
        const fetchImpl = jest.fn();
        const result = await sendWhatsAppReminder({}, {
            config: { ...mockEnv, WHATSAPP_MODE: "disabled" },
            fetchImpl,
        });

        expect(result).toMatchObject({ status: "skipped", mode: "disabled", skipped: true });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("generates a URL-encoded deeplink that requires seller action", async () => {
        const config = { ...mockEnv, WHATSAPP_MODE: "deeplink" };
        const result = await sendWhatsAppReminder(reminderDetails, { config });
        const deeplink = new URL(result.deeplink);

        expect(result).toMatchObject({
            status: "link_generated",
            provider: "whatsapp_deeplink",
            deliveryConfirmed: false,
            requiresSellerAction: true,
        });
        expect(deeplink.origin).toBe("https://wa.me");
        expect(deeplink.pathname).toBe("/919876543210");
        expect(deeplink.searchParams.get("text")).toContain("INV-2026-101");
        expect(deeplink.searchParams.get("text")).toContain(reminderDetails.paymentUrl);
        expect(result.deeplink).not.toContain(" ");
        expect(buildWhatsAppDeeplink(reminderDetails, config)).toBe(result.deeplink);
    });

    it("sends the configured Cloud template with variables in the required order", async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
                messaging_product: "whatsapp",
                contacts: [{ input: "customer phone" }],
                messages: [{ id: "wamid.provider-message-1" }],
            }),
        });
        const service = new WhatsAppService({
            config: { ...mockEnv, WHATSAPP_MODE: "cloud" },
            fetchImpl,
        });

        const result = await service.sendReminder(reminderDetails);
        const [, requestOptions] = fetchImpl.mock.calls[0];
        const requestBody = JSON.parse(requestOptions.body);
        const templateValues = requestBody.template.components[0].parameters.map(({ text }) => text);

        expect(result).toEqual({
            status: "sent",
            mode: "cloud",
            provider: "whatsapp_cloud",
            providerMessageId: "wamid.provider-message-1",
            retryable: false,
            requiresSellerAction: false,
        });
        expect(fetchImpl).toHaveBeenCalledWith(
            "https://graph.facebook.com/v23.0/123456789/messages",
            expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) })
        );
        expect(requestOptions.headers.Authorization).toBe(`Bearer ${mockEnv.WHATSAPP_ACCESS_TOKEN}`);
        expect(requestBody.messaging_product).toBe("whatsapp");
        expect(requestBody.type).toBe("template");
        expect(templateValues[0]).toBe(reminderDetails.customerName);
        expect(templateValues[1]).toBe(reminderDetails.organizationName);
        expect(templateValues[2]).toBe(reminderDetails.invoiceNumber);
        expect(templateValues[3]).toContain("1,250.50");
        expect(templateValues[4]).toContain("20 Jul 2026");
        expect(templateValues[5]).toBe(reminderDetails.paymentUrl);
    });

    it("returns a safe failure without calling fetch when Cloud credentials are missing", async () => {
        const fetchImpl = jest.fn();
        const result = await sendWhatsAppReminder(reminderDetails, {
            config: {
                ...mockEnv,
                WHATSAPP_MODE: "cloud",
                WHATSAPP_ACCESS_TOKEN: "",
            },
            fetchImpl,
        });

        expect(result).toMatchObject({
            status: "failed",
            provider: "whatsapp_cloud",
            error: "WhatsApp Cloud is not configured",
            retryable: false,
        });
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
