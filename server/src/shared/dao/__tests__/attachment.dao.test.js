import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import AttachmentDao from "../attachment.dao.js";
import UserDao from "../user.dao.js";
import OrganizationDao from "../organization.dao.js";

const attachmentDao = new AttachmentDao();
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

describe("Attachment DAO Tests", () => {
    let org, user;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        user = await userDao.createUser({ name: "Uploader User", email: "uploader@acme.com", password: "password123" });
    });

    it("should create an attachment successfully", async () => {
        const attachment = await attachmentDao.create({
            organizationId: org._id,
            filename: "invoice.pdf",
            fileUrl: "https://bucket.s3/invoice.pdf",
            fileType: "application/pdf",
            fileSize: 2048,
            uploadedBy: user._id
        });
        expect(attachment).toBeDefined();
        expect(attachment.filename).toBe("invoice.pdf");
        expect(attachment.fileUrl).toBe("https://bucket.s3/invoice.pdf");
        expect(attachment.fileSize).toBe(2048);
    });

    it("should fail to create attachment without filename or fileUrl", async () => {
        await expect(attachmentDao.create({
            organizationId: org._id,
            fileUrl: "https://bucket.s3/invoice.pdf",
            uploadedBy: user._id
        })).rejects.toThrow();

        await expect(attachmentDao.create({
            organizationId: org._id,
            filename: "invoice.pdf",
            uploadedBy: user._id
        })).rejects.toThrow();
    });

    it("should find and populate attachment details", async () => {
        const attachment = await attachmentDao.create({
            organizationId: org._id,
            filename: "invoice.pdf",
            fileUrl: "https://bucket.s3/invoice.pdf",
            uploadedBy: user._id
        });

        const found = await attachmentDao.findById(attachment._id);
        expect(found).toBeDefined();
        expect(found.uploadedBy.email).toBe("uploader@acme.com");
    });

    it("should update attachment details", async () => {
        const attachment = await attachmentDao.create({
            organizationId: org._id,
            filename: "invoice.pdf",
            fileUrl: "https://bucket.s3/invoice.pdf",
            uploadedBy: user._id
        });

        const updated = await attachmentDao.updateById(attachment._id, { filename: "renamed_invoice.pdf" });
        expect(updated.filename).toBe("renamed_invoice.pdf");
    });

    it("should delete attachment by id", async () => {
        const attachment = await attachmentDao.create({
            organizationId: org._id,
            filename: "invoice.pdf",
            fileUrl: "https://bucket.s3/invoice.pdf",
            uploadedBy: user._id
        });

        await attachmentDao.deleteById(attachment._id);
        const found = await attachmentDao.findById(attachment._id);
        expect(found).toBeNull();
    });
});
