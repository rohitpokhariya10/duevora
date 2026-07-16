import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import CustomerDao from "../customer.dao.js";
import OrganizationDao from "../organization.dao.js";

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

describe("Customer DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a customer successfully", async () => {
        const customerData = {
            organizationId: org._id,
            name: "John Doe",
            email: "john.doe@example.com",
            phone: "1234567890",
            address: "123 Main St",
            taxNumber: "TAX123"
        };
        const customer = await customerDao.create(customerData);
        expect(customer).toBeDefined();
        expect(customer.name).toBe("John Doe");
        expect(customer.email).toBe("john.doe@example.com");
        expect(customer.status).toBe("active");
    });

    it("should fail to create customer without required fields", async () => {
        await expect(customerDao.create({ organizationId: org._id })).rejects.toThrow();
        await expect(customerDao.create({ name: "John Doe" })).rejects.toThrow();
    });

    it("should find customer by id", async () => {
        const customer = await customerDao.create({
            organizationId: org._id,
            name: "John Doe",
            email: "john.doe@example.com"
        });

        const found = await customerDao.findById(customer._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
        expect(found.name).toBe("John Doe");
    });

    it("should update customer details", async () => {
        const customer = await customerDao.create({
            organizationId: org._id,
            name: "John Doe",
            email: "john.doe@example.com"
        });

        const updated = await customerDao.updateById(customer._id, { name: "Johnny Doe" });
        expect(updated.name).toBe("Johnny Doe");
    });

    it("should delete customer by id", async () => {
        const customer = await customerDao.create({
            organizationId: org._id,
            name: "John Doe",
            email: "john.doe@example.com"
        });

        await customerDao.deleteById(customer._id);
        const found = await customerDao.findById(customer._id);
        expect(found).toBeNull();
    });
});
