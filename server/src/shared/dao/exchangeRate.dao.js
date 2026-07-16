import ExchangeRate from "../models/exchangeRate.model.js";

class ExchangeRateDao {
    constructor() {
        this.Model = ExchangeRate;
    }

    async create(data, session = null) {
        const doc = new this.Model(data);
        return await doc.save({ session });
    }

    async findById(id, session = null) {
        return await this.Model.findById(id).populate("organizationId currencyId").session(session);
    }

    async findOne(filter, session = null) {
        return await this.Model.findOne(filter).populate("organizationId currencyId").session(session);
    }

    async find(filter = {}, options = {}, session = null) {
        let query = this.Model.find(filter).populate("organizationId currencyId").session(session);
        if (options.sort) query = query.sort(options.sort);
        if (options.limit) query = query.limit(options.limit);
        if (options.skip) query = query.skip(options.skip);
        return await query;
    }

    async updateById(id, updateData, session = null) {
        return await this.Model.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
            session
        }).populate("organizationId currencyId");
    }

    async deleteById(id, session = null) {
        return await this.Model.findByIdAndDelete(id, { session });
    }
}

export default ExchangeRateDao;
