import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import CurrencyDao from "../currency.dao.js";
import OrganizationDao from "../organization.dao.js";

const currencyDao = new CurrencyDao();
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

describe("Currency DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a currency successfully", async () => {
        const currency = await currencyDao.create({
            organizationId: org._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$",
            isBase: true
        });
        expect(currency).toBeDefined();
        expect(currency.name).toBe("US Dollar");
        expect(currency.code).toBe("USD");
        expect(currency.symbol).toBe("$");
        expect(currency.isBase).toBe(true);
    });

    it("should fail to create duplicate currency code in same organization", async () => {
        await currencyDao.create({
            organizationId: org._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$"
        });

        await expect(currencyDao.create({
            organizationId: org._id,
            name: "United States Dollar",
            code: "USD",
            symbol: "USD$"
        })).rejects.toThrow();
    });

    it("should allow same currency code in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const c1 = await currencyDao.create({
            organizationId: org._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$"
        });
        const c2 = await currencyDao.create({
            organizationId: org2._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$"
        });

        expect(c1).toBeDefined();
        expect(c2).toBeDefined();
    });

    it("should find currency by id", async () => {
        const currency = await currencyDao.create({
            organizationId: org._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$"
        });

        const found = await currencyDao.findById(currency._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update currency base status", async () => {
        const currency = await currencyDao.create({
            organizationId: org._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$"
        });

        const updated = await currencyDao.updateById(currency._id, { isBase: true });
        expect(updated.isBase).toBe(true);
    });

    it("should delete currency by id", async () => {
        const currency = await currencyDao.create({
            organizationId: org._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$"
        });

        await currencyDao.deleteById(currency._id);
        const found = await currencyDao.findById(currency._id);
        expect(found).toBeNull();
    });
});
