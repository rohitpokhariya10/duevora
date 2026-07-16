import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import NotificationDao from "../notification.dao.js";
import UserDao from "../user.dao.js";
import OrganizationDao from "../organization.dao.js";

const notificationDao = new NotificationDao();
const userDao = new UserDao();
const organizationDao = new OrganizationDao();

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

describe("Notification DAO Tests", () => {
    let org, user;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        user = await userDao.createUser({ name: "Notify User", email: "user@acme.com", password: "password123" });
    });

    it("should create a notification successfully", async () => {
        const notif = await notificationDao.create({
            organizationId: org._id,
            userId: user._id,
            title: "Invoice Generated",
            message: "Invoice INV-2026-001 has been generated.",
            type: "invoice"
        });
        expect(notif).toBeDefined();
        expect(notif.title).toBe("Invoice Generated");
        expect(notif.isRead).toBe(false);
        expect(notif.type).toBe("invoice");
    });

    it("should fail to create notification without title or message", async () => {
        await expect(notificationDao.create({
            organizationId: org._id,
            userId: user._id,
            message: "Invoice INV-2026-001 has been generated."
        })).rejects.toThrow();
    });

    it("should find and populate notification details", async () => {
        const notif = await notificationDao.create({
            organizationId: org._id,
            userId: user._id,
            title: "Invoice Generated",
            message: "Invoice INV-2026-001 has been generated."
        });

        const found = await notificationDao.findById(notif._id);
        expect(found).toBeDefined();
        expect(found.userId.email).toBe("user@acme.com");
    });

    it("should update read status of notification", async () => {
        const notif = await notificationDao.create({
            organizationId: org._id,
            userId: user._id,
            title: "Invoice Generated",
            message: "Invoice INV-2026-001 has been generated."
        });

        const updated = await notificationDao.updateById(notif._id, { isRead: true });
        expect(updated.isRead).toBe(true);
    });

    it("should delete notification by id", async () => {
        const notif = await notificationDao.create({
            organizationId: org._id,
            userId: user._id,
            title: "Invoice Generated",
            message: "Invoice INV-2026-001 has been generated."
        });

        await notificationDao.deleteById(notif._id);
        const found = await notificationDao.findById(notif._id);
        expect(found).toBeNull();
    });
});
