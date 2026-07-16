import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import ExchangeRateDao from "../exchangeRate.dao.js";
import CurrencyDao from "../currency.dao.js";
import OrganizationDao from "../organization.dao.js";

const exchangeRateDao = new ExchangeRateDao();
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

describe("ExchangeRate DAO Tests", () => {
    let org, currency;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        currency = await currencyDao.create({
            organizationId: org._id,
            name: "US Dollar",
            code: "USD",
            symbol: "$"
        });
    });

    it("should create an exchange rate successfully", async () => {
        const er = await exchangeRateDao.create({
            organizationId: org._id,
            currencyId: currency._id,
            rate: 83.25,
            effectiveDate: new Date()
        });
        expect(er).toBeDefined();
        expect(er.rate).toBe(83.25);
    });

    it("should fail to create exchange rate without rate or effective date", async () => {
        await expect(exchangeRateDao.create({
            organizationId: org._id,
            currencyId: currency._id,
            rate: 83.25
        })).rejects.toThrow();
    });

    it("should find and populate exchange rate details", async () => {
        const er = await exchangeRateDao.create({
            organizationId: org._id,
            currencyId: currency._id,
            rate: 83.25,
            effectiveDate: new Date()
        });

        const found = await exchangeRateDao.findById(er._id);
        expect(found).toBeDefined();
        expect(found.currencyId.code).toBe("USD");
    });

    it("should update exchange rate value", async () => {
        const er = await exchangeRateDao.create({
            organizationId: org._id,
            currencyId: currency._id,
            rate: 83.25,
            effectiveDate: new Date()
        });

        const updated = await exchangeRateDao.updateById(er._id, { rate: 84.10 });
        expect(updated.rate).toBe(84.10);
    });

    it("should delete exchange rate by id", async () => {
        const er = await exchangeRateDao.create({
            organizationId: org._id,
            currencyId: currency._id,
            rate: 83.25,
            effectiveDate: new Date()
        });

        await exchangeRateDao.deleteById(er._id);
        const found = await exchangeRateDao.findById(er._id);
        expect(found).toBeNull();
    });
});
