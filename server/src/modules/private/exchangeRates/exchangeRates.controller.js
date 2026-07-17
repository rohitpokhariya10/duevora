// Importing modules
import ExchangeRateDao from "../../../shared/dao/exchangeRate.dao.js";
import CurrencyDao from "../../../shared/dao/currency.dao.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle exchange rate operations
class ExchangeRatesController {

    constructor() {

        // initializing the daos
        this.exchangeRateDao = new ExchangeRateDao();
        this.currencyDao = new CurrencyDao();

    }

    // create a new exchange rate
    createExchangeRate = async (req, res) => {

        const { currencyId, rate, effectiveDate } = req.body;
        const organizationId = req.user.organizationId;

        // validating currency exists in organization
        const currency = await this.currencyDao.findOne({
            _id: currencyId,
            organizationId
        });

        if (!currency) {

            throw new NotFound("Currency reference not found in your organization.");

        }

        // creating exchange rate record using exchange rate dao
        const exchangeRate = await this.exchangeRateDao.create({
            organizationId,
            currencyId,
            rate,
            effectiveDate: new Date(effectiveDate)
        });

        return Created(res, "Exchange rate created successfully", exchangeRate);

    }

}

export default ExchangeRatesController;
