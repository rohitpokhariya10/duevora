import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import ActivityLogDao from "../activityLog.dao.js";
import UserDao from "../user.dao.js";
import OrganizationDao from "../organization.dao.js";

const activityLogDao = new ActivityLogDao();
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

describe("ActivityLog DAO Tests", () => {
    let org, user;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        user = await userDao.createUser({ name: "Activity User", email: "user@acme.com", password: "password123" });
    });

    it("should create an activity log successfully", async () => {
        const activity = await activityLogDao.create({
            organizationId: org._id,
            userId: user._id,
            activity: "User Logged In",
            ipAddress: "192.168.1.1",
            userAgent: "Mozilla/5.0"
        });
        expect(activity).toBeDefined();
        expect(activity.activity).toBe("User Logged In");
        expect(activity.ipAddress).toBe("192.168.1.1");
        expect(activity.userAgent).toBe("Mozilla/5.0");
    });

    it("should fail to create activity log without activity", async () => {
        await expect(activityLogDao.create({
            organizationId: org._id,
            userId: user._id
        })).rejects.toThrow();
    });

    it("should find and populate activity log details", async () => {
        const activity = await activityLogDao.create({
            organizationId: org._id,
            userId: user._id,
            activity: "User Logged In"
        });

        const found = await activityLogDao.findById(activity._id);
        expect(found).toBeDefined();
        expect(found.userId.email).toBe("user@acme.com");
    });

    it("should update activity log details", async () => {
        const activity = await activityLogDao.create({
            organizationId: org._id,
            userId: user._id,
            activity: "User Logged In"
        });

        const updated = await activityLogDao.updateById(activity._id, { activity: "User Logged Out" });
        expect(updated.activity).toBe("User Logged Out");
    });

    it("should delete activity log by id", async () => {
        const activity = await activityLogDao.create({
            organizationId: org._id,
            userId: user._id,
            activity: "User Logged In"
        });

        await activityLogDao.deleteById(activity._id);
        const found = await activityLogDao.findById(activity._id);
        expect(found).toBeNull();
    });
});
