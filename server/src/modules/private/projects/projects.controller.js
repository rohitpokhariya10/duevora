// Importing modules
import ProjectDao from "../../../shared/dao/project.dao.js";
import CustomerDao from "../../../shared/dao/customer.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

class ProjectsController {

    constructor() {
        this.projectDao = new ProjectDao();
        this.customerDao = new CustomerDao();
    }

    createProject = async (req, res) => {
        const { name, code, customerId, status } = req.body;
        const organizationId = req.user.organizationId;

        const formattedCode = code.trim().toUpperCase();

        // validate customer if provided
        if (customerId) {
            const customer = await this.customerDao.findOne({ _id: customerId, organizationId });
            if (!customer) {
                throw new NotFound("Customer reference not found in your organization.");
            }
        }

        const existing = await this.projectDao.findOne({ organizationId, code: formattedCode });
        if (existing) {
            throw new Conflict("Project code already exists in your organization.");
        }

        const project = await this.projectDao.create({
            organizationId,
            name: name.trim(),
            code: formattedCode,
            customerId: customerId || undefined,
            status: status || "active"
        });

        return Created(res, "Project created successfully", project);
    }

}

export default ProjectsController;
