import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import transporter from '../config/email.js';
import { getPasswordResetEmail } from '../utils/emailTemplates.js';

const router = express.Router();

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        // Intentionally send a generic success response even if user not found
        // to prevent email enumeration attacks.
        if (!user) {
            console.log(`Password reset request for non-existent user: ${email}`);
            return res.status(200).json({ msg: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate a token
        const resetToken = crypto.randomBytes(20).toString('hex');
        
        // Hash token and set to user model
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
            
        // Set token expiration (e.g., 1 hour)
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour in ms

        await user.save();

        // Create reset URL (compatible with HashRouter)
        const resetUrl = `${process.env.FRONTEND_URL}/#/reset-password/${resetToken}`;

        // Send email
        const { subject, html } = getPasswordResetEmail(user.name, resetUrl);
        const mailOptions = {
            from: `"Zenith Platform" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: subject,
            html: html,
        };
        
        await transporter.sendMail(mailOptions);

        res.status(200).json({ msg: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (err) {
        console.error('FORGOT PASSWORD ERROR:', err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;

    // Basic validation for password
    if (!password || password.length < 8) {
        return res.status(400).json({ msg: 'Password must be at least 8 characters long.' });
    }

    try {
        // Get hashed token
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Find user by token and check if token is still valid
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ msg: 'Password reset token is invalid or has expired.' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        
        // Clear reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        
        res.status(200).json({ msg: 'Password has been successfully reset.' });

    } catch (err) {
        console.error('RESET PASSWORD ERROR:', err.message);
        res.status(500).send('Server Error');
    }
});


export default router;
