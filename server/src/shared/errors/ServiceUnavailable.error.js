import ApiError from "../utils/ApiError.util.js";
import HTTP_STATUS from "../constants/StatusCodes.constants.js";

class ServiceUnavailable extends ApiError {

    constructor(message) {
        super(HTTP_STATUS.SERVICE_UNAVAILABLE, message);
        this.message = message;
    }

}

export default ServiceUnavailable;
