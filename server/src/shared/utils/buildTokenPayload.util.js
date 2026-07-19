import EmployeeDao from "../dao/employee.dao.js";
import EmployeeRoleDao from "../dao/employeeRole.dao.js";
import RolePermissionDao from "../dao/rolePermission.dao.js";
import EmployeePermissionDao from "../dao/employeePermission.dao.js";
import PermissionDao from "../dao/permission.dao.js";

async function buildTokenPayload(user) {
    const employeeDao = new EmployeeDao();
    const employee = await employeeDao.findOne({ userId: user._id });

    let employeeId = null;
    let organizationId = null;
    let roles = [];
    let permissions = [];

    if (employee) {

        employeeId = employee._id;
        organizationId = employee.organizationId._id || employee.organizationId;

        const employeeRoleDao = new EmployeeRoleDao();
        const employeeRoles = await employeeRoleDao.find({ employeeId: employee._id });

        const roleIds = [];
        for (const er of employeeRoles) {

            if (er.roleId) {

                roles.push(er.roleId.code);
                roleIds.push(er.roleId._id);

            }

        }

        const rolePermissionDao = new RolePermissionDao();
        const rolePermissions = await rolePermissionDao.find({ roleId: { $in: roleIds } });

        const permissionMap = new Map();
        for (const rp of rolePermissions) {
            if (rp.permissionId) {
                permissionMap.set(rp.permissionId.code, true);
            }
        }

        if (roles.includes("ADMIN")) {
            const permissionDao = new PermissionDao();
            const allPermissions = await permissionDao.find({});
            for (const p of allPermissions) {
                permissionMap.set(p.code, true);
            }
        }

        const employeePermissionDao = new EmployeePermissionDao();
        const employeePermissions = await employeePermissionDao.find({ employeeId: employee._id });

        for (const ep of employeePermissions) {

            if (ep.permissionId) {

                if (ep.type === "grant") {

                    permissionMap.set(ep.permissionId.code, true);

                } else if (ep.type === "deny") {

                    permissionMap.delete(ep.permissionId.code);

                }

            }

        }

        permissions = Array.from(permissionMap.keys());

    }

    const tokenPayload = {
        _id: user._id,
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        ...(employee && {
            employeeId: employeeId.toString(),
            organizationId: organizationId.toString(),
            roles,
            permissions
        })
    };

    return tokenPayload;
}

export default buildTokenPayload;
