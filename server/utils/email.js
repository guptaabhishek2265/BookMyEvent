const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const cleanEnv = (value) => (value || '').trim().replace(/^['"]|['"]$/g, '');
const emailUser = cleanEnv(process.env.EMAIL_USER);
const emailPassword = cleanEnv(process.env.EMAIL_PASS).replace(/\s/g, '');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 465),
    secure: String(process.env.EMAIL_SECURE || 'true') === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
        user: emailUser,
        pass: emailPassword
    }
});

const sendMail = async (mailOptions) => {
    if (!emailUser || !emailPassword) {
        throw new Error('Email service is not configured');
    }
    return transporter.sendMail({
        ...mailOptions,
        from: mailOptions.from || `"Eventora" <${emailUser}>`
    });
};

const verifyEmailConfig = async () => {
    if (!emailUser || !emailPassword) {
        throw new Error('EMAIL_USER and EMAIL_PASS are required');
    }

    await transporter.verify();
    return {
        user: emailUser,
        host: transporter.options.host,
        port: transporter.options.port
    };
};

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        const mailOptions = {
            to: userEmail,
            subject: `Booking Confirmed: ${eventTitle}`,
            html: `
        <h2>Hi ${userName}!</h2>
        <p>Your booking for the event <strong>${eventTitle}</strong> is successfully confirmed.</p>
        <p>Thank you for choosing Eventora.</p>
      `
        };
        await sendMail(mailOptions);
        console.log('Email sent successfully to', userEmail);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = type === 'account_verification' ? 'Verify your Eventora Account' : 'Eventora Booking Verification';
        const msg = type === 'account_verification'
            ? 'Please use the following OTP to verify your new Eventora account.'
            : 'Please use the following OTP to verify and confirm your event booking.';

        const mailOptions = {
            to: userEmail,
            subject: title,
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #111;">${title}</h2>
                    <p style="color: #555; font-size: 16px;">${msg}</p>
                    <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; background: #f4f4f4; width: max-content; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
                </div>
            `
        };
        await sendMail(mailOptions);
        console.log(`OTP sent to ${userEmail} for ${type}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};

module.exports = { sendBookingEmail, sendOTPEmail, verifyEmailConfig };
