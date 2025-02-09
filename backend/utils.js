const nodemailer = require('nodemailer');
require('dotenv').config();

const handleError = (res, error, status = 500, message = 'An error occurred') => {
    console.error(error);
    res.status(status).json({ message });
};
const sendEmail = async ({ to, subject, body }) => {
    try{
        const transporter = nodemailer.createTransport({
             host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
               user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
           },
        });
      await transporter.sendMail({
         from: process.env.SMTP_USER,
        to,
          subject,
         html: body, // Use html for email body.
        });
        console.log('Email sent successfully');
    } catch (error) {
       console.error('Error sending email:', error);
       throw error; // rethrow to handle error further
     }
};

module.exports = {
    sendEmail,
    handleError
};