const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // If user is a DOCTOR, attach doctor details
  let doctorDetails = null;
  if (user.role === 'DOCTOR') {
    doctorDetails = db.prepare(`
      SELECT d.id, d.room_number, d.specialization, d.status, dep.name as department_name, dep.id as department_id, dep.code as department_code
      FROM doctors d
      JOIN departments dep ON d.department_id = dep.id
      WHERE d.user_id = ?
    `).get(user.id);
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    doctor_id: doctorDetails ? doctorDetails.id : null,
    department_id: doctorDetails ? doctorDetails.department_id : null
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      doctor: doctorDetails
    }
  });
}

function getCurrentUser(req, res) {
  const user = db.prepare('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let doctorDetails = null;
  if (user.role === 'DOCTOR') {
    doctorDetails = db.prepare(`
      SELECT d.id, d.room_number, d.specialization, d.status, dep.name as department_name, dep.id as department_id, dep.code as department_code
      FROM doctors d
      JOIN departments dep ON d.department_id = dep.id
      WHERE d.user_id = ?
    `).get(user.id);
  }

  return res.json({
    user: {
      ...user,
      doctor: doctorDetails
    }
  });
}

function getDemoUsers(req, res) {
  const users = [
    { username: 'reception', role: 'RECEPTIONIST', label: 'Receptionist (Sarah Jenkins)', defaultPass: 'hospital123' },
    { username: 'dr.sharma', role: 'DOCTOR', label: 'Dr. Sharma (Cardiology - Room 101)', defaultPass: 'hospital123' },
    { username: 'dr.patel', role: 'DOCTOR', label: 'Dr. Patel (Pediatrics - Room 104)', defaultPass: 'hospital123' },
    { username: 'wardadmin', role: 'WARD_ADMIN', label: 'Ward Staff (Marcus Vance)', defaultPass: 'hospital123' },
    { username: 'admin', role: 'ADMIN', label: 'Hospital Admin (Director Reed)', defaultPass: 'hospital123' }
  ];
  return res.json({ demoUsers: users });
}

module.exports = {
  login,
  getCurrentUser,
  getDemoUsers
};
