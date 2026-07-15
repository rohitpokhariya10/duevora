// Importing modules
import createApp from "./src/app.js";
import env from "./src/shared/config/env.config.js";
import logger from "./src/shared/config/logger.config.js";

// function to start the server
function startServer() {

    // making the app
    const app = createApp();

    // starting the server
    app.listen(env.PORT, () => {
        logger.info(`Server is running on http://localhost:${env.PORT}`);
    });

}

// starting the server
startServer();
