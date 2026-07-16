// Importing modules
import UserDao from "../../../shared/dao/user.dao.js";
import EmployeeDao from "../../../shared/dao/employee.dao.js";

// class to handle users operations
class UsersController {

    constructor() {

        // initializing the user dao
        this.userDao = new UserDao();

        // initializing the employee dao
        this.employeeDao = new EmployeeDao();

    }

    // list users with pagination and search
    listUsers = async (req, res) => {

        const organizationId = req.user.organizationId;

        // finding all employee records for the organization to extract user ids
        const employees = await this.employeeDao.find({ organizationId });
        const userIds = employees.map(emp => emp.userId?._id || emp.userId);

        // formulating user filter
        const filter = {
            _id: {
                $in: userIds
            }
        };

        // checking if search query is provided
        if (req.query.search) {

            const searchRegex = {
                $regex: req.query.search,
                $options: "i"
            };

            filter.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];

        }

        // parsing pagination and sorting parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

        // counting total records matching filter using the underlying mongoose model
        const total = await this.userDao.UserModel.countDocuments(filter);

        // fetching users using user dao
        const users = await this.userDao.find(filter, {
            sort: { [sortBy]: sortOrder },
            limit,
            skip
        });

        // sanitizing users to remove sensitive fields
        const sanitizedUsers = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified
        }));

        // constructing pagination metadata
        const pages = Math.ceil(total / limit);
        
        return res.status(200).json({
            success: true,
            status: 200,
            message: "Users retrieved successfully",
            data: sanitizedUsers,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        });

    }

}

export default UsersController;
