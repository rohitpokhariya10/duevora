// Importing modules
import RoleDao from "../../../shared/dao/role.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle roles operations
class RolesController {

    constructor() {

        // initializing the role dao
        this.roleDao = new RoleDao();

    }

    // create a new role
    createRole = async (req, res) => {

        const { name, code, description } = req.body;
        const organizationId = req.user.organizationId;

        // checking if role code already exists within the organization
        const existingRole = await this.roleDao.findOne({
            organizationId,
            code: code.toUpperCase()
        });

        if (existingRole) {

            throw new Conflict("Role code already exists in this organization.");

        }

        // creating the role using the role dao
        const role = await this.roleDao.create({
            organizationId,
            name,
            code: code.toUpperCase(),
            description: description || ""
        });

        return Created(res, "Role created successfully", role);

    }

}

export default RolesController;
