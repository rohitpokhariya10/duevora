import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import SettingDao from "../setting.dao.js";
import OrganizationDao from "../organization.dao.js";

const settingDao = new SettingDao();
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

describe("Setting DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a setting successfully", async () => {
        const setting = await settingDao.create({
            organizationId: org._id,
            key: "theme",
            value: "dark"
        });
        expect(setting).toBeDefined();
        expect(setting.key).toBe("theme");
        expect(setting.value).toBe("dark");
    });

    it("should fail to create duplicate setting key in same organization", async () => {
        await settingDao.create({
            organizationId: org._id,
            key: "theme",
            value: "dark"
        });

        await expect(settingDao.create({
            organizationId: org._id,
            key: "theme",
            value: "light"
        })).rejects.toThrow();
    });

    it("should allow same setting key in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const s1 = await settingDao.create({
            organizationId: org._id,
            key: "theme",
            value: "dark"
        });
        const s2 = await settingDao.create({
            organizationId: org2._id,
            key: "theme",
            value: "light"
        });

        expect(s1).toBeDefined();
        expect(s2).toBeDefined();
    });

    it("should find setting by id", async () => {
        const setting = await settingDao.create({
            organizationId: org._id,
            key: "theme",
            value: "dark"
        });

        const found = await settingDao.findById(setting._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update setting details", async () => {
        const setting = await settingDao.create({
            organizationId: org._id,
            key: "theme",
            value: "dark"
        });

        const updated = await settingDao.updateById(setting._id, { value: "light" });
        expect(updated.value).toBe("light");
    });

    it("should delete setting by id", async () => {
        const setting = await settingDao.create({
            organizationId: org._id,
            key: "theme",
            value: "dark"
        });

        await settingDao.deleteById(setting._id);
        const found = await settingDao.findById(setting._id);
        expect(found).toBeNull();
    });
});
