// Importing modules
import mongoose from "mongoose";
import RoleDao from "../../../shared/dao/role.dao.js";
import RolePermissionDao from "../../../shared/dao/rolePermission.dao.js";
import PermissionDao from "../../../shared/dao/permission.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle roles operations
class RolesController {

    constructor() {

        // initializing the role dao
        this.roleDao = new RoleDao();

        // initializing the role permission dao
        this.rolePermissionDao = new RolePermissionDao();

        // initializing the permission dao
        this.permissionDao = new PermissionDao();

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

    // bind permissions to a role
    bindPermissions = async (req, res) => {

        const { roleId } = req.params;
        const { permissionIds } = req.body;
        const organizationId = req.user.organizationId;

        // verifying target role belongs to caller's organization context
        const role = await this.roleDao.findOne({ _id: roleId, organizationId });

        if (!role) {

            throw new NotFound("Role not found in your organization.");

        }

        // verifying that all permissionIds exist in the system
        const uniquePermissionIds = [...new Set(permissionIds)];
        const count = await this.permissionDao.Model.countDocuments({
            _id: {
                $in: uniquePermissionIds
            }
        });

        if (count !== uniquePermissionIds.length) {

            throw new BadRequest("One or more permission IDs are invalid.");

        }

        // starting database transaction to bind permissions atomically
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // deleting all existing permission bindings for this role
            await this.rolePermissionDao.Model.deleteMany({ roleId }, { session });

            // creating new bindings
            const bindings = uniquePermissionIds.map((permId) => ({
                roleId,
                permissionId: permId
            }));

            // inserting new bindings in bulk
            await this.rolePermissionDao.Model.insertMany(bindings, { session });

            // committing transaction
            await session.commitTransaction();

            return Ok(res, "Permissions bound to role successfully");

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending session
            session.endSession();

        }

    }

}

export default RolesController;
