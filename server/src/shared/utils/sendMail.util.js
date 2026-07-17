// Importing modules
import transporter from "../config/mail.config.js";
import logger from "../config/logger.config.js";
import env from "../config/env.config.js";

// function to send the mails
function sendMail(to, subject, html) {

    if (env.SEND_MAIL) {
        // using transporter to send the mails 
        transporter.sendMail({
            from: env.SENDING_USER,
            to,
            subject,
            html
        });
    } else {
        // logs the things using the logger in the console
        logger.info(`[Mail Mock Log] To: ${to} | Subject: ${subject} | HTML: ${html}`);
    }

}

export default sendMail;
