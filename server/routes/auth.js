const express = require('express');
const router = express.Router();
const { register, login, verifyOTP, googleAuth } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/verify-otp', verifyOTP);

module.exports = router;
