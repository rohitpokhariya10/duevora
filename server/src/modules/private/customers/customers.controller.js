// Importing modules
import CustomerDao from "../../../shared/dao/customer.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle customer operations
class CustomersController {

    constructor() {

        // initializing the customer dao
        this.customerDao = new CustomerDao();

    }

    // create a new customer
    createCustomer = async (req, res) => {

        const { name, email, phone, address, taxNumber, status } = req.body;
        const organizationId = req.user.organizationId;

        // if email is provided, verifying that it is unique within the organization context
        if (email) {

            const existingCustomer = await this.customerDao.findOne({
                organizationId,
                email: email.toLowerCase()
            });

            if (existingCustomer) {

                throw new Conflict("Customer with this email already exists in your organization.");

            }

        }

        // creating the customer using the customer dao
        const customer = await this.customerDao.create({
            organizationId,
            name,
            email: email ? email.toLowerCase() : undefined,
            phone: phone || "",
            address: address || "",
            taxNumber: taxNumber || "",
            status: status || "active"
        });

        return Created(res, "Customer profile created successfully", customer);

    }

    // list customers with pagination, sorting, and search
    listCustomers = async (req, res) => {

        const organizationId = req.user.organizationId;

        // formulating customer filter based on organization isolation
        const filter = {
            organizationId
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
        const total = await this.customerDao.Model.countDocuments(filter);

        // fetching customers using customer dao
        const customers = await this.customerDao.find(filter, {
            sort: { [sortBy]: sortOrder },
            limit,
            skip
        });

        // constructing pagination metadata
        const pages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            status: 200,
            message: "Customers retrieved successfully",
            data: customers,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        });

    }

}

export default CustomersController;
