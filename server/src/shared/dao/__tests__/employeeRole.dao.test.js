import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import EmployeeRoleDao from "../employeeRole.dao.js";
import EmployeeDao from "../employee.dao.js";
import RoleDao from "../role.dao.js";
import OrganizationDao from "../organization.dao.js";

const employeeRoleDao = new EmployeeRoleDao();
const employeeDao = new EmployeeDao();
const roleDao = new RoleDao();
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

describe("EmployeeRole DAO Tests", () => {
    let org, emp, role;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        emp = await employeeDao.create({
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
        });
        role = await roleDao.create({ organizationId: org._id, name: "Manager", code: "MGR" });
    });

    it("should create an employee role link successfully", async () => {
        const er = await employeeRoleDao.create({
            employeeId: emp._id,
            roleId: role._id
        });
        expect(er).toBeDefined();
        expect(er.employeeId.toString()).toBe(emp._id.toString());
        expect(er.roleId.toString()).toBe(role._id.toString());
    });

    it("should fail to create duplicate employee role links", async () => {
        await employeeRoleDao.create({
            employeeId: emp._id,
            roleId: role._id
        });

        await expect(employeeRoleDao.create({
            employeeId: emp._id,
            roleId: role._id
        })).rejects.toThrow();
    });

    it("should find and populate employee role link", async () => {
        const er = await employeeRoleDao.create({
            employeeId: emp._id,
            roleId: role._id
        });

        const found = await employeeRoleDao.findById(er._id);
        expect(found).toBeDefined();
        expect(found.employeeId._id.toString()).toBe(emp._id.toString());
        expect(found.employeeId.firstName).toBe("John");
        expect(found.roleId._id.toString()).toBe(role._id.toString());
        expect(found.roleId.name).toBe("Manager");
    });

    it("should delete employee role link successfully", async () => {
        const er = await employeeRoleDao.create({
            employeeId: emp._id,
            roleId: role._id
        });

        await employeeRoleDao.deleteById(er._id);
        const found = await employeeRoleDao.findById(er._id);
        expect(found).toBeNull();
    });
});
