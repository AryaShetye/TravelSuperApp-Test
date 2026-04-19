/**
 * Authentication & Authorization Middleware
 * Works with Firebase Firestore or in-memory DB
 */

const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB
    const db = getDB();
    const userDoc = await db.collection('users').doc(decoded.id).get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found. Token invalid.' });
    }

    const user = userDoc.data();

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated.' });
    }

    req.user = { ...user, id: decoded.id };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDB();
      const userDoc = await db.collection('users').doc(decoded.id).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        if (user.isActive) req.user = { ...user, id: decoded.id };
      }
    }
  } catch {
    // Silently ignore
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
