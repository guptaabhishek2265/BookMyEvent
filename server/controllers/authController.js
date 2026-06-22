const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sendOTPEmail } = require('../utils/email');
const { validateLogin, validateRegistration } = require('../utils/validation');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(googleClientId);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const userResponse = (user) => ({
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    token: generateToken(user.id, user.role)
});

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const validationError = validateRegistration({ name, email, password });
        if (validationError) return res.status(400).json({ message: validationError });

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user', // Hardcoded to prevent frontend passing role
            isVerified: false
        });

        const otp = generateOTP();
        await OTP.create({ email, otp, action: 'account_verification' });
        await sendOTPEmail(email, otp, 'account_verification');

        res.status(201).json({
            message: 'OTP sent to email. Please verify.',
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const validationError = validateLogin({ email, password });
        if (validationError) return res.status(400).json({ message: validationError });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        if (!user.password) return res.status(400).json({ message: 'Please sign in with Google' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        if (!user.isVerified && user.role !== 'admin') {
            const otp = generateOTP();
            await OTP.findOneAndDelete({ email: user.email, action: 'account_verification' });
            await OTP.create({ email: user.email, otp, action: 'account_verification' });
            await sendOTPEmail(user.email, otp, 'account_verification');
            return res.status(403).json({ message: 'Account not verified', needsVerification: true, email: user.email });
        }

        res.json(userResponse(user));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.googleAuth = async (req, res) => {
    try {
        if (!googleClientId) {
            return res.status(500).json({ message: 'Google authentication is not configured' });
        }

        const { credential } = req.body;
        if (!credential) return res.status(400).json({ message: 'Google credential is required' });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId
        });
        const payload = ticket.getPayload();

        if (!payload?.email || !payload?.email_verified) {
            return res.status(400).json({ message: 'Google account email is not verified' });
        }

        const email = payload.email.toLowerCase();
        let user = await User.findOne({ email });

        if (user) {
            if (user.googleId && user.googleId !== payload.sub) {
                return res.status(409).json({ message: 'This email is linked to a different Google account' });
            }

            user.googleId = payload.sub;
            user.isVerified = true;
            if (!user.name && payload.name) user.name = payload.name;
            await user.save();
        } else {
            user = await User.create({
                name: payload.name || email.split('@')[0],
                email,
                googleId: payload.sub,
                authProvider: 'google',
                role: 'user',
                isVerified: true
            });
        }

        res.json(userResponse(user));
    } catch (error) {
        res.status(401).json({ message: 'Google authentication failed' });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const validOTP = await OTP.findOne({ email, otp, action: 'account_verification' });

        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
        await OTP.deleteOne({ _id: validOTP._id }); // Delete OTP after usage

        res.json(userResponse(user));
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
