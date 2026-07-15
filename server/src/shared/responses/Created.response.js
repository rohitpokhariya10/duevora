// Importing modules 
import ApiReponse from "../utils/ApiResponse.util.js";
import HTTP_STATUS from "../constants/StatusCodes.constants.js";

// function to send the created response
function Created(res, message, data = null) {

    // sending the response with the status code, message and data
    return ApiReponse(res, HTTP_STATUS.CREATED, message, data);

}

export default Created;