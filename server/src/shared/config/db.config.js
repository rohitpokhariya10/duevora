// Importing modules
import mongoose from "mongoose";
import env from "./env.config.js";
import logger from "./logger.config.js";

// function to connect to the database
function connectDB() {

    try {

        // connecting to the database
        mongoose.connect(env.MONGO_URI);
        logger.info("Connected to the database");

    }
    catch (error) {

        // logging the error
        logger.error("Error connecting to the database:", error);

    }

}

export default connectDB;