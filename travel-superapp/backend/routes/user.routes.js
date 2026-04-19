/**
 * User Routes — Firebase/In-Memory DB
 */

const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { getDB } = require('../config/db');

router.use(authenticate);

// Get profile
router.get('/profile', async (req, res, next) => {
  try {
    const db = getDB();
    const doc = await db.collection('users').doc(req.user.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    const { password, ...user } = doc.data();
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Upload avatar (Cloudinary)
router.put('/avatar', async (req, res, next) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: 'avatarUrl is required' });

    const db = getDB();
    await db.collection('users').doc(req.user.id).update({ avatar: avatarUrl, updatedAt: new Date().toISOString() });
    res.json({ message: 'Avatar updated', avatarUrl });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
