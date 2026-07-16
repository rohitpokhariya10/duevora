import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import ProjectDao from "../project.dao.js";
import CustomerDao from "../customer.dao.js";
import OrganizationDao from "../organization.dao.js";

const projectDao = new ProjectDao();
const customerDao = new CustomerDao();
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

describe("Project DAO Tests", () => {
    let org, customer;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        customer = await customerDao.create({ organizationId: org._id, name: "John Doe" });
    });

    it("should create a project successfully", async () => {
        const projectData = {
            organizationId: org._id,
            name: "ERP Implementation",
            code: "ERP01",
            customerId: customer._id
        };
        const project = await projectDao.create(projectData);
        expect(project).toBeDefined();
        expect(project.name).toBe("ERP Implementation");
        expect(project.code).toBe("ERP01");
        expect(project.status).toBe("active");
    });

    it("should fail to create duplicate project code in same organization", async () => {
        const p1 = {
            organizationId: org._id,
            name: "ERP Implementation",
            code: "ERP01"
        };
        const p2 = {
            organizationId: org._id,
            name: "ERP Upgrade",
            code: "ERP01"
        };

        await projectDao.create(p1);
        await expect(projectDao.create(p2)).rejects.toThrow();
    });

    it("should allow same project code in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const p1 = {
            organizationId: org._id,
            name: "ERP Implementation",
            code: "ERP01"
        };
        const p2 = {
            organizationId: org2._id,
            name: "ERP Implementation",
            code: "ERP01"
        };

        const proj1 = await projectDao.create(p1);
        const proj2 = await projectDao.create(p2);
        expect(proj1).toBeDefined();
        expect(proj2).toBeDefined();
    });

    it("should find project by id and populate relationships", async () => {
        const project = await projectDao.create({
            organizationId: org._id,
            name: "ERP Implementation",
            code: "ERP01",
            customerId: customer._id
        });

        const found = await projectDao.findById(project._id);
        expect(found).toBeDefined();
        expect(found.customerId.name).toBe("John Doe");
    });

    it("should update project details", async () => {
        const project = await projectDao.create({
            organizationId: org._id,
            name: "ERP Implementation",
            code: "ERP01"
        });

        const updated = await projectDao.updateById(project._id, { status: "inactive" });
        expect(updated.status).toBe("inactive");
    });

    it("should delete project by id", async () => {
        const project = await projectDao.create({
            organizationId: org._id,
            name: "ERP Implementation",
            code: "ERP01"
        });

        await projectDao.deleteById(project._id);
        const found = await projectDao.findById(project._id);
        expect(found).toBeNull();
    });
});
