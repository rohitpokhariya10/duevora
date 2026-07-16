import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import DeliveryChallanDao from "../deliveryChallan.dao.js";
import CustomerDao from "../customer.dao.js";
import OrganizationDao from "../organization.dao.js";

const deliveryChallanDao = new DeliveryChallanDao();
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

describe("DeliveryChallan DAO Tests", () => {
    let org, customer;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        customer = await customerDao.create({ organizationId: org._id, name: "John Doe" });
    });

    it("should create a delivery challan successfully", async () => {
        const challanData = {
            organizationId: org._id,
            customerId: customer._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date(),
            status: "draft"
        };
        const challan = await deliveryChallanDao.create(challanData);
        expect(challan).toBeDefined();
        expect(challan.challanNumber).toBe("DC-2026-001");
        expect(challan.status).toBe("draft");
    });

    it("should fail to create duplicate challan number in same organization", async () => {
        const c1 = {
            organizationId: org._id,
            customerId: customer._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date()
        };
        const c2 = {
            organizationId: org._id,
            customerId: customer._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date()
        };

        await deliveryChallanDao.create(c1);
        await expect(deliveryChallanDao.create(c2)).rejects.toThrow();
    });

    it("should allow same challan number in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });
        const customer2 = await customerDao.create({ organizationId: org2._id, name: "Jane Smith" });

        const c1 = {
            organizationId: org._id,
            customerId: customer._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date()
        };
        const c2 = {
            organizationId: org2._id,
            customerId: customer2._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date()
        };

        const dc1 = await deliveryChallanDao.create(c1);
        const dc2 = await deliveryChallanDao.create(c2);
        expect(dc1).toBeDefined();
        expect(dc2).toBeDefined();
    });

    it("should find delivery challan by id and populate relationship", async () => {
        const challan = await deliveryChallanDao.create({
            organizationId: org._id,
            customerId: customer._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date()
        });

        const found = await deliveryChallanDao.findById(challan._id);
        expect(found).toBeDefined();
        expect(found.customerId.name).toBe("John Doe");
    });

    it("should update delivery challan details", async () => {
        const challan = await deliveryChallanDao.create({
            organizationId: org._id,
            customerId: customer._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date()
        });

        const updated = await deliveryChallanDao.updateById(challan._id, { status: "dispatched" });
        expect(updated.status).toBe("dispatched");
    });

    it("should delete delivery challan by id", async () => {
        const challan = await deliveryChallanDao.create({
            organizationId: org._id,
            customerId: customer._id,
            challanNumber: "DC-2026-001",
            challanDate: new Date()
        });

        await deliveryChallanDao.deleteById(challan._id);
        const found = await deliveryChallanDao.findById(challan._id);
        expect(found).toBeNull();
    });
});
