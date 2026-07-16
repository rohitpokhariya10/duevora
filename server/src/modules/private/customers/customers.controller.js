// Importing modules
import CustomerDao from "../../../shared/dao/customer.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

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
                email: email.toLowerCase(),
                isDeleted: {
                    $ne: true
                }
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
            status: status || "active",
            isDeleted: false
        });

        return Created(res, "Customer profile created successfully", customer);

    }

    // list customers with pagination, sorting, and search
    listCustomers = async (req, res) => {

        const organizationId = req.user.organizationId;

        // formulating customer filter based on organization isolation and excluding soft deleted customers
        const filter = {
            organizationId,
            isDeleted: {
                $ne: true
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

    // get customer details by id
    getCustomerDetails = async (req, res) => {

        const { customerId } = req.params;
        const organizationId = req.user.organizationId;

        // finding the customer profile within the organization context and excluding soft deleted customers
        const customer = await this.customerDao.findOne({
            _id: customerId,
            organizationId,
            isDeleted: {
                $ne: true
            }
        });

        if (!customer) {

            throw new NotFound("Customer profile not found in your organization.");

        }

        return Ok(res, "Customer details retrieved successfully", customer);

    }

    // update customer profile details
    updateCustomer = async (req, res) => {

        const { customerId } = req.params;
        const { name, email, phone, address, taxNumber, status } = req.body;
        const organizationId = req.user.organizationId;

        // verifying target customer belongs to caller's organization context
        const customer = await this.customerDao.findOne({
            _id: customerId,
            organizationId,
            isDeleted: {
                $ne: true
            }
        });

        if (!customer) {

            throw new NotFound("Customer profile not found in your organization.");

        }

        // if email is updated, verifying that it is unique within the organization context
        if (email && email.toLowerCase() !== customer.email) {

            const existingCustomer = await this.customerDao.findOne({
                organizationId,
                email: email.toLowerCase(),
                _id: {
                    $ne: customerId
                },
                isDeleted: {
                    $ne: true
                }
            });

            if (existingCustomer) {

                throw new Conflict("Customer with this email already exists in your organization.");

            }

        }

        // updating customer record using customer dao
        const updatedCustomer = await this.customerDao.updateById(customerId, {
            name: name !== undefined ? name : customer.name,
            email: email !== undefined ? email.toLowerCase() : customer.email,
            phone: phone !== undefined ? phone : customer.phone,
            address: address !== undefined ? address : customer.address,
            taxNumber: taxNumber !== undefined ? taxNumber : customer.taxNumber,
            status: status !== undefined ? status : customer.status
        });

        return Ok(res, "Customer profile updated successfully", updatedCustomer);

    }

    // soft delete a customer profile
    deleteCustomer = async (req, res) => {

        const { customerId } = req.params;
        const organizationId = req.user.organizationId;

        // verifying target customer belongs to caller's organization context and excluding soft deleted customers
        const customer = await this.customerDao.findOne({
            _id: customerId,
            organizationId,
            isDeleted: {
                $ne: true
            }
        });

        if (!customer) {

            throw new NotFound("Customer profile not found in your organization.");

        }

        // soft deleting customer by setting isDeleted to true
        await this.customerDao.updateById(customerId, {
            isDeleted: true
        });

        return Ok(res, "Customer profile deleted successfully");

    }

}

export default CustomersController;
