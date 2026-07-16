import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import DepartmentDao from "../department.dao.js";
import OrganizationDao from "../organization.dao.js";

const departmentDao = new DepartmentDao();
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

describe("Department DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a department successfully", async () => {
        const deptData = {
            organizationId: org._id,
            name: "Engineering",
            code: "ENG"
        };
        const dept = await departmentDao.create(deptData);
        expect(dept).toBeDefined();
        expect(dept.name).toBe("Engineering");
        expect(dept.code).toBe("ENG");
    });

    it("should fail to create duplicate department code in same organization", async () => {
        const dept1 = {
            organizationId: org._id,
            name: "Engineering",
            code: "ENG"
        };
        const dept2 = {
            organizationId: org._id,
            name: "Software Engineering",
            code: "ENG"
        };

        await departmentDao.create(dept1);
        await expect(departmentDao.create(dept2)).rejects.toThrow();
    });

    it("should allow same department code in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const dept1 = {
            organizationId: org._id,
            name: "Engineering",
            code: "ENG"
        };
        const dept2 = {
            organizationId: org2._id,
            name: "Engineering",
            code: "ENG"
        };

        const d1 = await departmentDao.create(dept1);
        const d2 = await departmentDao.create(dept2);
        expect(d1).toBeDefined();
        expect(d2).toBeDefined();
    });

    it("should find department by id and populate relationships", async () => {
        const dept = await departmentDao.create({
            organizationId: org._id,
            name: "Engineering",
            code: "ENG"
        });

        const found = await departmentDao.findById(dept._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update department details", async () => {
        const dept = await departmentDao.create({
            organizationId: org._id,
            name: "Engineering",
            code: "ENG"
        });

        const updated = await departmentDao.updateById(dept._id, { name: "R&D" });
        expect(updated.name).toBe("R&D");
    });

    it("should delete department by id", async () => {
        const dept = await departmentDao.create({
            organizationId: org._id,
            name: "Engineering",
            code: "ENG"
        });

        await departmentDao.deleteById(dept._id);
        const found = await departmentDao.findById(dept._id);
        expect(found).toBeNull();
    });
});
