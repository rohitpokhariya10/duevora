// Importing modules
import CategoryDao from "../../../shared/dao/category.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle category operations
class CategoriesController {

    constructor() {

        // initializing the category dao
        this.categoryDao = new CategoryDao();

    }

    // create a new category
    createCategory = async (req, res) => {

        const { name, code, parentId } = req.body;
        const organizationId = req.user.organizationId;

        // verifying category code is unique within the organization context
        const existingCategory = await this.categoryDao.findOne({
            organizationId,
            code: code.toUpperCase()
        });

        if (existingCategory) {

            throw new Conflict("Category code already exists in your organization.");

        }

        // if parentId is provided, validating that parent category exists in the organization context
        if (parentId) {

            const parentCategory = await this.categoryDao.findOne({
                _id: parentId,
                organizationId
            });

            if (!parentCategory) {

                throw new NotFound("Parent category not found in your organization.");

            }

        }

        // creating category record using category dao
        const category = await this.categoryDao.create({
            organizationId,
            name,
            code: code.toUpperCase(),
            parentId: parentId || undefined
        });

        return Created(res, "Category created successfully", category);

    }

}

export default CategoriesController;
