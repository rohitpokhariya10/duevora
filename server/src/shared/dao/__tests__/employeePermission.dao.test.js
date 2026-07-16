import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import EmployeePermissionDao from "../employeePermission.dao.js";
import EmployeeDao from "../employee.dao.js";
import PermissionDao from "../permission.dao.js";
import OrganizationDao from "../organization.dao.js";

const employeePermissionDao = new EmployeePermissionDao();
const employeeDao = new EmployeeDao();
const permissionDao = new PermissionDao();
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

describe("EmployeePermission DAO Tests", () => {
    let org, emp, permission;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        emp = await employeeDao.create({
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
        });
        permission = await permissionDao.create({ name: "Create Invoice", code: "INV_CREATE", module: "billing" });
    });

    it("should create an employee permission link successfully", async () => {
        const ep = await employeePermissionDao.create({
            employeeId: emp._id,
            permissionId: permission._id,
            type: "deny"
        });
        expect(ep).toBeDefined();
        expect(ep.employeeId.toString()).toBe(emp._id.toString());
        expect(ep.permissionId.toString()).toBe(permission._id.toString());
        expect(ep.type).toBe("deny");
    });

    it("should fail to create duplicate employee permission links", async () => {
        await employeePermissionDao.create({
            employeeId: emp._id,
            permissionId: permission._id
        });

        await expect(employeePermissionDao.create({
            employeeId: emp._id,
            permissionId: permission._id
        })).rejects.toThrow();
    });

    it("should find and populate employee permission link", async () => {
        const ep = await employeePermissionDao.create({
            employeeId: emp._id,
            permissionId: permission._id,
            type: "grant"
        });

        const found = await employeePermissionDao.findById(ep._id);
        expect(found).toBeDefined();
        expect(found.employeeId._id.toString()).toBe(emp._id.toString());
        expect(found.employeeId.firstName).toBe("John");
        expect(found.permissionId._id.toString()).toBe(permission._id.toString());
        expect(found.permissionId.name).toBe("Create Invoice");
    });

    it("should delete employee permission link successfully", async () => {
        const ep = await employeePermissionDao.create({
            employeeId: emp._id,
            permissionId: permission._id
        });

        await employeePermissionDao.deleteById(ep._id);
        const found = await employeePermissionDao.findById(ep._id);
        expect(found).toBeNull();
    });
});
