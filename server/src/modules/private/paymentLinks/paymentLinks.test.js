import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

const mockCreatePaymentLink = jest.fn();
const mockCancelPaymentLink = jest.fn();

jest.unstable_mockModule("../../../shared/services/razorpay.service.js", () => ({
    __esModule: true,
    default: {
        createPaymentLink: mockCreatePaymentLink,
        fetchPaymentLink: jest.fn(),
        cancelPaymentLink: mockCancelPaymentLink,
    },
}));

const { default: createApp } = await import("../../../app.js");
const { default: env } = await import("../../../shared/config/env.config.js");
const { default: Account } = await import("../../../shared/models/account.model.js");
const { default: Customer } = await import("../../../shared/models/customer.model.js");
const { default: Invoice } = await import("../../../shared/models/invoice.model.js");
const { default: Organization } = await import("../../../shared/models/organization.model.js");
const { default: PaymentLink } = await import("../../../shared/models/paymentLink.model.js");
const { default: Receipt } = await import("../../../shared/models/receipt.model.js");
const { default: BadGateway } = await import("../../../shared/errors/BadGateway.error.js");

let app;
let mongoServer;
let organization;
let otherOrganization;
let customer;
let invoice;
let token;
let otherToken;

function accessToken(organizationId) {
    return jwt.sign({
        userId: new mongoose.Types.ObjectId().toString(),
        organizationId: organizationId.toString(),
        roles: ["admin"],
        permissions: [],
    }, env.ACCESS_TOKEN_SECRET);
}

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await PaymentLink.syncIndexes();
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    for (const collection of Object.values(mongoose.connection.collections)) {
        await collection.deleteMany({});
    }

    jest.clearAllMocks();
    mockCreatePaymentLink.mockResolvedValue({
        id: "plink_test_1",
        short_url: "https://rzp.io/i/test-link",
        status: "created",
        created_at: 1784428200,
    });
    mockCancelPaymentLink.mockResolvedValue({ status: "cancelled" });

    organization = await Organization.create({ name: "Seller Org", code: "SELLER" });
    otherOrganization = await Organization.create({ name: "Other Org", code: "OTHER" });
    customer = await Customer.create({
        organizationId: organization._id,
        name: "Asha Customer",
        email: "asha@example.com",
        phone: "98765 43210",
    });
    invoice = await Invoice.create({
        organizationId: organization._id,
        customerId: customer._id,
        invoiceNumber: "INV-PL-001",
        invoiceDate: new Date("2026-07-01T00:00:00.000Z"),
        dueDate: new Date("2026-08-01T00:00:00.000Z"),
        subTotal: 1000,
        taxTotal: 180,
        grandTotal: 1180,
        status: "sent",
    });
    token = accessToken(organization._id);
    otherToken = accessToken(otherOrganization._id);
});

describe("Payment Link API", () => {
    it("creates a Razorpay link for a sent invoice using integer paise", async () => {
        const response = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(201);
        expect(response.body.data.paymentUrl).toBe("https://rzp.io/i/test-link");
        expect(response.body.data.outstandingAmount).toBe(1180);
        expect(mockCreatePaymentLink).toHaveBeenCalledWith(expect.objectContaining({
            amount: 118000,
            accept_partial: true,
            notify: { sms: false, email: false },
        }));

        const stored = await PaymentLink.findOne({ invoiceId: invoice._id });
        expect(stored.amountPaise).toBe(118000);
        expect(stored.active).toBe(true);
    });

    it("uses only the outstanding amount after a partial receipt", async () => {
        const account = await Account.create({
            organizationId: organization._id,
            name: "Bank",
            code: "BANK",
            type: "asset",
        });
        await Receipt.create({
            organizationId: organization._id,
            customerId: customer._id,
            invoiceId: invoice._id,
            receiptNumber: "REC-PARTIAL",
            receiptDate: new Date("2026-07-10T00:00:00.000Z"),
            amount: 180,
            paymentMethod: "bank",
            accountId: account._id,
        });

        const response = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(201);
        expect(response.body.data.outstandingAmount).toBe(1000);
        expect(mockCreatePaymentLink.mock.calls[0][0].amount).toBe(100000);
    });

    it("reuses a valid active link", async () => {
        const first = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${token}`);
        const second = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${token}`);

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);
        expect(second.body.data.paymentLinkId).toBe(first.body.data.paymentLinkId);
        expect(mockCreatePaymentLink).toHaveBeenCalledTimes(1);
    });

    it("reserves one active link under concurrent creation", async () => {
        mockCreatePaymentLink.mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return {
                id: "plink_concurrent",
                short_url: "https://rzp.io/i/concurrent",
                status: "created",
                created_at: 1784428200,
            };
        });

        const [first, second] = await Promise.all([
            request(app)
                .post(`/api/invoices/${invoice._id}/payment-link`)
                .set("Authorization", `Bearer ${token}`),
            request(app)
                .post(`/api/invoices/${invoice._id}/payment-link`)
                .set("Authorization", `Bearer ${token}`),
        ]);

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);
        expect(mockCreatePaymentLink).toHaveBeenCalledTimes(1);
        expect(await PaymentLink.countDocuments({ invoiceId: invoice._id, active: true })).toBe(1);
    });

    it.each(["draft", "paid"])("rejects a %s invoice", async (status) => {
        invoice.status = status;
        await invoice.save();

        const response = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(mockCreatePaymentLink).not.toHaveBeenCalled();
    });

    it("does not reveal invoices from another organization", async () => {
        const response = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${otherToken}`);

        expect(response.status).toBe(404);
        expect(mockCreatePaymentLink).not.toHaveBeenCalled();
    });

    it("marks the local reservation failed when Razorpay fails", async () => {
        mockCreatePaymentLink.mockRejectedValue(
            new BadGateway("Unable to create payment link at this time.")
        );

        const response = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(502);
        const stored = await PaymentLink.findOne({ invoiceId: invoice._id });
        expect(stored.status).toBe("failed");
        expect(stored.active).toBe(false);
    });

    it("cancels a link idempotently", async () => {
        const created = await request(app)
            .post(`/api/invoices/${invoice._id}/payment-link`)
            .set("Authorization", `Bearer ${token}`);

        const first = await request(app)
            .post(`/api/payment-links/${created.body.data.paymentLinkId}/cancel`)
            .set("Authorization", `Bearer ${token}`);
        const second = await request(app)
            .post(`/api/payment-links/${created.body.data.paymentLinkId}/cancel`)
            .set("Authorization", `Bearer ${token}`);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(second.body.data.status).toBe("cancelled");
        expect(mockCancelPaymentLink).toHaveBeenCalledTimes(1);
    });
});
