// Importing modules
import createApp from "./src/app.js";
import connectDB from "./src/shared/config/db.config.js";
import logger from "./src/shared/config/logger.config.js";
import env from "./src/shared/config/env.config.js";
import seedPermissions from "./src/shared/seeds/permission.seed.js";

// function to start the server
async function startServer() {

    // making the app
    const app = createApp();

    await connectDB();

    // seed permissions before serving requests
    await seedPermissions();

    // starting the server
    app.listen(env.PORT, () => {
        logger.info(`Server is running on port ${env.PORT}`);
    });

}

// starting the server
startServer();
