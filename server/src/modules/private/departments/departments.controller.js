// Importing modules
import DepartmentDao from "../../../shared/dao/department.dao.js";
import EmployeeDao from "../../../shared/dao/employee.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle department operations
class DepartmentsController {

    constructor() {

        // initializing the department dao
        this.departmentDao = new DepartmentDao();

        // initializing the employee dao
        this.employeeDao = new EmployeeDao();

    }

    // create a new department
    createDepartment = async (req, res) => {

        const { name, code, managerId } = req.body;
        const organizationId = req.user.organizationId;

        // checking if department code already exists within the organization
        const existingDept = await this.departmentDao.findOne({
            organizationId,
            code: code.toUpperCase()
        });

        if (existingDept) {

            throw new Conflict("Department code already exists in this organization.");

        }

        // if managerId is provided, verifying that the employee exists and belongs to the organization
        if (managerId) {

            const employee = await this.employeeDao.findOne({
                _id: managerId,
                organizationId
            });

            if (!employee) {

                throw new BadRequest("Invalid manager employee ID.");

            }

        }

        // creating the department using department dao
        const department = await this.departmentDao.create({
            organizationId,
            name,
            code: code.toUpperCase(),
            managerId: managerId || null
        });

        return Created(res, "Department created successfully", department);

    }

}

export default DepartmentsController;
