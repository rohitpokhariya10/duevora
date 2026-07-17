// Importing modules
import CostCenterDao from "../../../shared/dao/costCenter.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import Created from "../../../shared/responses/Created.response.js";

class CostCentersController {

    constructor() {
        this.costCenterDao = new CostCenterDao();
    }

    createCostCenter = async (req, res) => {
        const { name, code, status } = req.body;
        const organizationId = req.user.organizationId;

        const formattedCode = code.trim().toUpperCase();

        const existing = await this.costCenterDao.findOne({ organizationId, code: formattedCode });
        if (existing) {
            throw new Conflict("Cost center code already exists in your organization.");
        }

        const costCenter = await this.costCenterDao.create({
            organizationId,
            name: name.trim(),
            code: formattedCode,
            status: status || "active"
        });

        return Created(res, "Cost center created successfully", costCenter);
    }

}

export default CostCentersController;
