const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter (this example uses Gmail)
   const transporter = nodemailer.createTransport({
            // REMOVE: service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail
                pass: process.env.EMAIL_PASS, // Your App Password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

    // 2. Define the email options
    const mailOptions = {
        from: '"ToyBlix" <no-reply@toyblix.com>', // Sender name and address
        to: options.email, // Receiver address
        subject: options.subject, // Subject line
        html: options.html, // HTML body
        attachments: options.attachments || [], // Support for PDF invoices
    };

    // 3. Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;