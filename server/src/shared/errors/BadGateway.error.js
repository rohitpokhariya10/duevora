import ApiError from "../utils/ApiError.util.js";
import HTTP_STATUS from "../constants/StatusCodes.constants.js";

class BadGateway extends ApiError {

    constructor(message) {
        super(HTTP_STATUS.BAD_GATEWAY, message);
        this.message = message;
    }

}

export default BadGateway;
