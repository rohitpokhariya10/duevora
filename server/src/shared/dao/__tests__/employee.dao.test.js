import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import EmployeeDao from "../employee.dao.js";
import OrganizationDao from "../organization.dao.js";

const employeeDao = new EmployeeDao();
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

describe("Employee DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create an employee successfully", async () => {
        const employeeData = {
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "1234567890",
            joiningDate: new Date()
        };

        const emp = await employeeDao.create(employeeData);
        expect(emp).toBeDefined();
        expect(emp.firstName).toBe("John");
        expect(emp.email).toBe("john.doe@example.com");
        expect(emp.status).toBe("active");
    });

    it("should fail to create employee with duplicate code in same org", async () => {
        const emp1 = {
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
        };
        const emp2 = {
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com"
        };

        await employeeDao.create(emp1);
        await expect(employeeDao.create(emp2)).rejects.toThrow();
    });

    it("should allow same employee code in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const emp1 = {
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
        };
        const emp2 = {
            organizationId: org2._id,
            employeeCode: "EMP001",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com"
        };

        const e1 = await employeeDao.create(emp1);
        const e2 = await employeeDao.create(emp2);
        expect(e1).toBeDefined();
        expect(e2).toBeDefined();
    });

    it("should find an employee by id and populate relationships", async () => {
        const emp = await employeeDao.create({
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
        });

        const found = await employeeDao.findById(emp._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
        expect(found.organizationId.name).toBe("Acme Corp");
    });

    it("should update employee details by id", async () => {
        const emp = await employeeDao.create({
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
        });

        const updated = await employeeDao.updateById(emp._id, { firstName: "Johnny" });
        expect(updated.firstName).toBe("Johnny");
    });

    it("should delete employee by id", async () => {
        const emp = await employeeDao.create({
            organizationId: org._id,
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com"
        });

        await employeeDao.deleteById(emp._id);
        const found = await employeeDao.findById(emp._id);
        expect(found).toBeNull();
    });
});
