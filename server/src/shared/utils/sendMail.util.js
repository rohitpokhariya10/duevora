// Importing modules
import transporter from "../config/mail.config.js";
import logger from "../config/logger.config.js";
import env from "../config/env.config.js";

const MOCK_EMAIL_MESSAGE_ID = "mock-email";

// The optional fourth argument keeps legacy callers working while supporting
// accessible plain-text email and safe reply routing for reminder messages.
async function sendMail(to, subject, html, options = {}) {
    const { text, replyTo } = options;

    if (!env.SEND_MAIL) {
        // Mock mode deliberately excludes recipients and content from logs.
        logger.info({ channel: "email", delivery: "mock" }, "Email delivery skipped because SEND_MAIL is disabled");
        return MOCK_EMAIL_MESSAGE_ID;
    }

    try {
        const result = await transporter.sendMail({
            from: env.SENDING_USER,
            to,
            subject,
            html,
            ...(text ? { text } : {}),
            ...(replyTo ? { replyTo } : {}),
        });

        return result?.messageId ?? null;
    } catch (error) {
        // Provider errors can contain transport metadata, so log only a safe code.
        logger.error(
            { channel: "email", code: typeof error?.code === "string" ? error.code : "SMTP_ERROR" },
            "Email delivery failed"
        );
        throw new Error("Email delivery failed");
    }
}

export { MOCK_EMAIL_MESSAGE_ID };
export default sendMail;
