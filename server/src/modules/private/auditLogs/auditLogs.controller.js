import AuditLogDao from "../../../shared/dao/auditLog.dao.js";
import Ok from "../../../shared/responses/Ok.response.js";

class AuditLogsController {
    constructor() { this.auditLogDao = new AuditLogDao(); }

    listAuditLogs = async (req, res) => {
        const { page = 1, limit = 20, entityType } = req.query;
        const organizationId = req.user.organizationId;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const filter = { organizationId };
        if (entityType) filter.entityType = entityType;

        const [logs, total] = await Promise.all([
            this.auditLogDao.Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate("userId", "name email"),
            this.auditLogDao.Model.countDocuments(filter)
        ]);

        return Ok(res, "Audit logs retrieved successfully", {
            logs, total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    }
}

export default AuditLogsController;
