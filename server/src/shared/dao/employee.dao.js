import Employee from "../models/employee.model.js";

class EmployeeDao {
    constructor() {
        this.Model = Employee;
    }

    async create(data, session = null) {
        const doc = new this.Model(data);
        return await doc.save({ session });
    }

    async findById(id, session = null) {
        return await this.Model.findById(id).populate("userId organizationId departmentId").session(session);
    }

    async findOne(filter, session = null) {
        return await this.Model.findOne(filter).populate("userId organizationId departmentId").session(session);
    }

    async find(filter = {}, options = {}, session = null) {
        let query = this.Model.find(filter).populate("userId organizationId departmentId").session(session);
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
        }).populate("userId organizationId departmentId");
    }

    async deleteById(id, session = null) {
        return await this.Model.findByIdAndDelete(id, { session });
    }
}

export default EmployeeDao;
