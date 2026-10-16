const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital-tracker-super-secret-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // 'ADMIN' role always has superuser access
    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
    });
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRoles
};
