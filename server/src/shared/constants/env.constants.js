const envConstants = {
    PORT: 3000,
    NODE_ENV: 'development',
    MONGO_URI: 'mongodb://localhost:27017/myapp',
    ACCESS_TOKEN_SECRET: "youraccesstokensecret",
    REFRESH_TOKEN_SECRET: "yourrefreshtokensecret",
    FRONTEND_URL: "http://localhost:5173",
    SMTP_HOST: "localhost",
    SMTP_PORT: 587,
    SMTP_USER: "username",
    SMTP_PASS: "pass",
    SENDING_USER: "Duevora <user>",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    SEND_MAIL: false,
    REDIS_URL: "",
    REDIS_HOST: "127.0.0.1",
    REDIS_PORT: 6379,
    REDIS_PASSWORD: "",
};

export default envConstants;