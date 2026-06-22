const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

dotenv.config();

const updateAdmin = async () => {
    try {
        const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_OLD_EMAIL } = process.env;

        if (!MONGO_URI) {
            throw new Error('MONGO_URI is missing in server/.env');
        }

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
            throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in server/.env');
        }

        await mongoose.connect(MONGO_URI);

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const existingAdmin = await User.findOne({
            $or: [
                { email: ADMIN_OLD_EMAIL || 'admin@eventora.com' },
                { email: ADMIN_EMAIL },
                { role: 'admin' }
            ]
        });

        if (existingAdmin) {
            existingAdmin.name = ADMIN_NAME || existingAdmin.name || 'Admin User';
            existingAdmin.email = ADMIN_EMAIL;
            existingAdmin.password = hashedPassword;
            existingAdmin.role = 'admin';
            existingAdmin.isVerified = true;
            await existingAdmin.save();
            console.log(`Admin updated: ${ADMIN_EMAIL}`);
        } else {
            await User.create({
                name: ADMIN_NAME || 'Admin User',
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });
            console.log(`Admin created: ${ADMIN_EMAIL}`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Failed to update admin:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

updateAdmin();
