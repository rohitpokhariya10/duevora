// Importing modules
import express from "express";
import router from "./shared/routers/index.router.js";

// function to make the app 
function createApp() {

    // create an express app
    const app = express();

    // adding the index router to the app
    app.use("/api", router);

    // returning the app
    return app;

}

export default createApp;