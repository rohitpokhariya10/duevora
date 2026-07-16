import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import AuditLogDao from "../auditLog.dao.js";
import UserDao from "../user.dao.js";
import OrganizationDao from "../organization.dao.js";

const auditLogDao = new AuditLogDao();
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

describe("AuditLog DAO Tests", () => {
    let org, user;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        user = await userDao.createUser({ name: "Audit User", email: "user@acme.com", password: "password123" });
    });

    it("should create an audit log successfully", async () => {
        const audit = await auditLogDao.create({
            organizationId: org._id,
            userId: user._id,
            action: "update",
            entityType: "Product",
            entityId: "12345",
            oldValues: { name: "Widget A", price: 10 },
            newValues: { name: "Widget A", price: 12 }
        });
        expect(audit).toBeDefined();
        expect(audit.action).toBe("update");
        expect(audit.entityType).toBe("Product");
        expect(audit.entityId).toBe("12345");
        expect(audit.oldValues.price).toBe(10);
        expect(audit.newValues.price).toBe(12);
    });

    it("should fail to create audit log without action or entityType", async () => {
        await expect(auditLogDao.create({
            organizationId: org._id,
            userId: user._id,
            entityType: "Product",
            entityId: "12345"
        })).rejects.toThrow();

        await expect(auditLogDao.create({
            organizationId: org._id,
            userId: user._id,
            action: "update",
            entityId: "12345"
        })).rejects.toThrow();
    });

    it("should find and populate audit log details", async () => {
        const audit = await auditLogDao.create({
            organizationId: org._id,
            userId: user._id,
            action: "update",
            entityType: "Product",
            entityId: "12345"
        });

        const found = await auditLogDao.findById(audit._id);
        expect(found).toBeDefined();
        expect(found.userId.email).toBe("user@acme.com");
    });

    it("should update audit log details", async () => {
        const audit = await auditLogDao.create({
            organizationId: org._id,
            userId: user._id,
            action: "update",
            entityType: "Product",
            entityId: "12345"
        });

        const updated = await auditLogDao.updateById(audit._id, { action: "delete" });
        expect(updated.action).toBe("delete");
    });

    it("should delete audit log by id", async () => {
        const audit = await auditLogDao.create({
            organizationId: org._id,
            userId: user._id,
            action: "update",
            entityType: "Product",
            entityId: "12345"
        });

        await auditLogDao.deleteById(audit._id);
        const found = await auditLogDao.findById(audit._id);
        expect(found).toBeNull();
    });
});
