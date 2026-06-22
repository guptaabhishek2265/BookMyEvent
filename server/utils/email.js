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

const parseBoolean = (value, fallback = false) => {
    const normalized = cleanEnv(value).toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
};

const parsePort = (value, fallback) => {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 ? port : fallback;
};

const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '';
    const [name, domain] = email.split('@');
    const safeName = name.length <= 2 ? `${name[0] || '*'}*` : `${name.slice(0, 2)}***${name.slice(-1)}`;
    return `${safeName}@${domain}`;
};

const emailUser = cleanEnv(process.env.EMAIL_USER);
const emailPassword = cleanEnv(process.env.EMAIL_PASS).replace(/\s/g, '');
const smtpHost = getEnv('SMTP_HOST', 'EMAIL_HOST') || 'smtp.gmail.com';
const smtpPort = parsePort(getEnv('SMTP_PORT', 'EMAIL_PORT'), 587);
const smtpSecureEnv = getEnv('SMTP_SECURE', 'EMAIL_SECURE');
const smtpSecure = smtpSecureEnv ? parseBoolean(smtpSecureEnv, false) : smtpPort === 465;
const smtpTimeoutMs = parsePort(process.env.SMTP_TIMEOUT_MS, 12000);

const createTransportOptions = ({ host, port, secure }) => ({
    host,
    port,
    secure,
    requireTLS: !secure && Number(port) === 587,
    connectionTimeout: smtpTimeoutMs,
    greetingTimeout: smtpTimeoutMs,
    socketTimeout: smtpTimeoutMs,
    dnsTimeout: smtpTimeoutMs,
    family: 4,
    tls: {
        servername: host
    },
    auth: {
        user: emailUser,
        pass: emailPassword
    }
});

const createCandidate = (label, config) => ({
    label,
    host: config.host,
    port: Number(config.port),
    secure: Boolean(config.secure),
    options: createTransportOptions(config)
});

const buildTransportCandidates = () => {
    const candidates = [
        createCandidate('configured', {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure
        })
    ];

    if (smtpHost.toLowerCase() === 'smtp.gmail.com') {
        candidates.push(
            createCandidate('gmail-starttls-587', {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false
            }),
            createCandidate('gmail-ssl-465', {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true
            })
        );
    }

    const seen = new Set();
    return candidates.filter((candidate) => {
        const key = `${candidate.host}:${candidate.port}:${candidate.secure}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const transportCandidates = buildTransportCandidates();
const createTransporter = (options) => nodemailer.createTransport(options);

const sanitizeError = (error) => ({
    message: error.message,
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    response: error.response,
    syscall: error.syscall,
    address: error.address,
    port: error.port
});

const isRetryableTransportError = (error) => {
    const retryableCodes = new Set(['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNRESET', 'EAI_AGAIN']);
    return retryableCodes.has(error.code) || /timeout|timed out|greeting never received/i.test(error.message || '');
};

const logEmailAttempt = (level, event, details) => {
    const payload = {
        event,
        ...details
    };

    if (level === 'error') {
        console.error(payload);
        return;
    }

    console.info(payload);
};

const runWithEmailTransport = async (operation, handler) => {
    const attempts = [];
    let lastError = null;

    for (const candidate of transportCandidates) {
        const startedAt = Date.now();
        logEmailAttempt('info', 'email_transport_attempt', {
            operation,
            label: candidate.label,
            host: candidate.host,
            port: candidate.port,
            secure: candidate.secure,
            timeoutMs: smtpTimeoutMs
        });

        try {
            const result = await handler(createTransporter(candidate.options), candidate);
            const attempt = {
                label: candidate.label,
                host: candidate.host,
                port: candidate.port,
                secure: candidate.secure,
                ok: true,
                durationMs: Date.now() - startedAt
            };
            attempts.push(attempt);
            logEmailAttempt('info', 'email_transport_success', { operation, ...attempt });
            return { result, candidate, attempts };
        } catch (error) {
            lastError = error;
            const safeError = sanitizeError(error);
            const attempt = {
                label: candidate.label,
                host: candidate.host,
                port: candidate.port,
                secure: candidate.secure,
                ok: false,
                durationMs: Date.now() - startedAt,
                error: safeError
            };
            attempts.push(attempt);
            logEmailAttempt('error', 'email_transport_failed', { operation, ...attempt });

            if (!isRetryableTransportError(error)) break;
        }
    }

    const error = lastError || new Error('Email delivery failed');
    error.emailAttempts = attempts;
    error.emailConfig = getEmailConfigSummary();
    throw error;
};

const getEmailConfigSummary = () => ({
    configured: Boolean(emailUser && emailPassword),
    userConfigured: Boolean(emailUser),
    passwordConfigured: Boolean(emailPassword),
    user: maskEmail(emailUser),
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    timeoutMs: smtpTimeoutMs,
    candidates: transportCandidates.map(({ label, host, port, secure }) => ({
        label,
        host,
        port,
        secure
    }))
});

const sendMail = async (mailOptions) => {
    if (!emailUser || !emailPassword) {
        const error = new Error('EMAIL_USER and EMAIL_PASS are required');
        error.emailConfig = getEmailConfigSummary();
        throw error;
    }

    const message = {
        ...mailOptions,
        from: mailOptions.from || `"Eventora" <${emailUser}>`
    };

    const { result } = await runWithEmailTransport('send_mail', (transporter) => transporter.sendMail(message));
    return result;
};

const verifyEmailConfig = async () => {
    if (!emailUser || !emailPassword) {
        const error = new Error('EMAIL_USER and EMAIL_PASS are required');
        error.emailConfig = getEmailConfigSummary();
        throw error;
    }

    const { candidate, attempts } = await runWithEmailTransport('verify_email_config', (transporter) => transporter.verify());
    return {
        configured: true,
        user: maskEmail(emailUser),
        host: candidate.host,
        port: candidate.port,
        secure: candidate.secure,
        attempts,
        config: getEmailConfigSummary()
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
        console.log('Email sent successfully to', maskEmail(userEmail));
    } catch (error) {
        console.error('Error sending email:', {
            ...sanitizeError(error),
            attempts: error.emailAttempts,
            config: error.emailConfig
        });
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
        console.log(`OTP sent to ${maskEmail(userEmail)} for ${type}`);
    } catch (error) {
        console.error('Error sending OTP email:', {
            ...sanitizeError(error),
            attempts: error.emailAttempts,
            config: error.emailConfig
        });
        throw error;
    }
};

module.exports = {
    getEmailConfigSummary,
    sendBookingEmail,
    sendOTPEmail,
    verifyEmailConfig
};
