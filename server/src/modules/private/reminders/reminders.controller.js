// Importing modules
import ReminderDao from "../../../shared/dao/reminder.dao.js";
import Created from "../../../shared/responses/Created.response.js";

class RemindersController {

    constructor() {
        this.reminderDao = new ReminderDao();
    }

    createReminder = async (req, res) => {
        const { title, dueDate, status, invoiceId, paymentId, description } = req.body;
        const organizationId = req.user.organizationId;

        const reminder = await this.reminderDao.create({
            organizationId,
            title: title.trim(),
            dueDate: new Date(dueDate),
            status: status || "pending",
            invoiceId: invoiceId || undefined,
            paymentId: paymentId || undefined,
            description: description || undefined
        });

        return Created(res, "Reminder created successfully", reminder);
    }

}

export default RemindersController;
