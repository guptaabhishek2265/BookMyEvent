const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const cleanEnv = (value) => (value || '').trim().replace(/^['"]|['"]$/g, '');
const getEnv = (...keys) => {
    for (const key of keys) {
        const value = cleanEnv(process.env[key]);
        if (value) return value;
    }
    return '';
};

const emailUser = cleanEnv(process.env.EMAIL_USER);
const emailPassword = cleanEnv(process.env.EMAIL_PASS).replace(/\s/g, '');
const smtpHost = getEnv('SMTP_HOST', 'EMAIL_HOST') || 'smtp.gmail.com';
const smtpPort = Number(getEnv('SMTP_PORT', 'EMAIL_PORT') || 587);
const smtpSecure = (getEnv('SMTP_SECURE', 'EMAIL_SECURE') || 'false') === 'true';

const primaryOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    auth: {
        user: emailUser,
        pass: emailPassword
    }
};

const fallbackOptions = {
    ...primaryOptions,
    port: 587,
    secure: false,
    requireTLS: true
};

const createTransporter = (options) => nodemailer.createTransport(options);

const shouldRetryWithStartTls = (error, options) => (
    options.host === 'smtp.gmail.com'
    && Number(options.port) === 465
    && ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET'].includes(error.code)
);

const sendMail = async (mailOptions) => {
    if (!emailUser || !emailPassword) {
        throw new Error('Email service is not configured');
    }

    const message = {
        ...mailOptions,
        from: mailOptions.from || `"Eventora" <${emailUser}>`
    };

    try {
        return await createTransporter(primaryOptions).sendMail(message);
    } catch (error) {
        if (!shouldRetryWithStartTls(error, primaryOptions)) throw error;
        console.warn('Gmail SMTP 465 failed; retrying with port 587 STARTTLS');
        return createTransporter(fallbackOptions).sendMail(message);
    }
};

const verifyEmailConfig = async () => {
    if (!emailUser || !emailPassword) {
        throw new Error('EMAIL_USER and EMAIL_PASS are required');
    }

    try {
        await createTransporter(primaryOptions).verify();
        return {
            user: emailUser,
            host: primaryOptions.host,
            port: primaryOptions.port,
            secure: primaryOptions.secure
        };
    } catch (error) {
        if (!shouldRetryWithStartTls(error, primaryOptions)) throw error;
        console.warn('Gmail SMTP 465 health check failed; retrying with port 587 STARTTLS');
        await createTransporter(fallbackOptions).verify();
        return {
            user: emailUser,
            host: fallbackOptions.host,
            port: fallbackOptions.port,
            secure: fallbackOptions.secure,
            fallback: true
        };
    }
};

const getEmailConfigSummary = () => ({
    configured: Boolean(emailUser && emailPassword),
    user: emailUser,
    host: primaryOptions.host,
    port: primaryOptions.port,
    secure: primaryOptions.secure
});

const getVerifiedEmailConfig = async () => {
    const result = await verifyEmailConfig();
    return {
        ...result,
        configured: true
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

module.exports = { getEmailConfigSummary, sendBookingEmail, sendOTPEmail, verifyEmailConfig: getVerifiedEmailConfig };
