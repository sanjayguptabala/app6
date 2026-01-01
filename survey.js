import express from 'express';
import Survey from '../models/Survey.js';
// In a real app with authentication, you would import and use an auth middleware
// import auth from '../middleware/auth.js'; 

const router = express.Router();

/**
 * @route   POST /api/survey/submit
 * @desc    Submit a daily survey
 * @access  Private (should be protected by auth middleware)
 */
// The 'auth' middleware would be added here in a real implementation
// Example: router.post('/submit', auth, async (req, res) => {
router.post('/submit', async (req, res) => {
    // In a real implementation with auth middleware, you would get userId from the token:
    // const userId = req.user.id; 
    // For now, we'll take it from the body for testing purposes.
    const { userId, responses, stressScore, category } = req.body;

    // Basic validation
    if (!userId || !responses || stressScore === undefined || !category) {
        return res.status(400).json({ msg: 'Please provide all required survey data.' });
    }

    try {
        const newSurvey = new Survey({
            userId,
            responses,
            stressScore,
            category,
        });

        const savedSurvey = await newSurvey.save();
        res.status(201).json(savedSurvey);

    } catch (err) {
        console.error(err.message);
        // Check for specific Mongoose validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validation error', errors: err.errors });
        }
        res.status(500).send('Server Error');
    }
});

export default router;
