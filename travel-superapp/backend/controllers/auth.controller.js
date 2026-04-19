/**
 * Auth Controller — Firebase/In-Memory DB
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── Validation Rules ─────────────────────────────────────────────────────────
const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('phone').optional(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

// ─── Register ─────────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password, phone, role } = req.body;
    const db = getDB();

    // Check if email already exists
    const existing = await db.collection('users').where('email', '==', email).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const allowedRoles = ['traveler', 'property_manager', 'driver', 'agent'];
    const userRole = allowedRoles.includes(role) ? role : 'traveler';

    const id = uuidv4();
    const userData = {
      id,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: userRole,
      avatar: null,
      isVerified: false,
      isActive: true,
      preferredLanguage: 'en',
      preferredCurrency: 'INR',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').doc(id).set(userData);

    const token = generateToken(userData);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: sanitizeUser(userData),
    });
  } catch (error) {
    next(error);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const db = getDB();

    const snapshot = await db.collection('users').where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await db.collection('users').doc(user.id).update({ lastLoginAt: new Date().toISOString() });

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get Current User ─────────────────────────────────────────────────────────
async function getMe(req, res, next) {
  try {
    const db = getDB();
    const userDoc = await db.collection('users').doc(req.user.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitizeUser(userDoc.data()) });
  } catch (error) {
    next(error);
  }
}

// ─── Update Profile ───────────────────────────────────────────────────────────
async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, phone, preferredLanguage, preferredCurrency } = req.body;
    const db = getDB();

    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (preferredLanguage) updates.preferredLanguage = preferredLanguage;
    if (preferredCurrency) updates.preferredCurrency = preferredCurrency;

    await db.collection('users').doc(req.user.id).update(updates);

    const updated = await db.collection('users').doc(req.user.id).get();
    res.json({ message: 'Profile updated', user: sanitizeUser(updated.data()) });
  } catch (error) {
    next(error);
  }
}

// ─── Change Password ──────────────────────────────────────────────────────────
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = getDB();

    const userDoc = await db.collection('users').doc(req.user.id).get();
    const user = userDoc.data();

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.collection('users').doc(req.user.id).update({ password: hashed });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register, login, getMe, updateProfile, changePassword,
  registerValidation, loginValidation,
};
