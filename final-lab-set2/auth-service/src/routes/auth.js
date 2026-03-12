const express  = require('express');
const bcrypt   = require('bcryptjs');
const { pool } = require('../db/db');
const { generateToken, verifyToken } = require('../middleware/jwtUtils');

const router = express.Router();

async function logEvent({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      `INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1,$2,$3,$4,$5)`,
      [level, event, userId || null, message || null, meta ? JSON.stringify(meta) : null]
    );
  } catch (_) {}
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email และ password จำเป็นต้องมี' });
  if (password.length < 6)
    return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });
  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]
    );
    if (exists.rows[0])
      return res.status(409).json({ error: 'Email หรือ username นี้ถูกใช้แล้ว' });

    const hash   = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username, email, role, created_at`,
      [username, email, hash]
    );
    const user  = result.rows[0];
    const token = generateToken({ sub: user.id, email: user.email, role: user.role, username: user.username });

    await logEvent({ level: 'INFO', event: 'REGISTER_SUCCESS', userId: user.id,
      message: `User ${user.username} registered`, meta: { username: user.username } });

    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ', token, user });
  } catch (err) {
    console.error('[AUTH] Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, email, password } = req.body;
  const identifier = email || username;
  if (!identifier || !password)
    return res.status(400).json({ error: 'กรุณากรอก email/username และ password' });
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1 OR username=$1', [identifier]
    );
    const user = result.rows[0];
    const dummyHash = '$2b$10$invalidhashpaddinginvalidhashpaddinginvalidhashpadding00';
    const isValid = await bcrypt.compare(password, user ? user.password_hash : dummyHash);

    if (!user || !isValid) {
      await logEvent({ level: 'WARN', event: 'LOGIN_FAILED',
        message: `Login failed for: ${identifier}`, meta: { identifier } });
      return res.status(401).json({ error: 'Email/Username หรือ Password ไม่ถูกต้อง' });
    }

    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
    const token = generateToken({ sub: user.id, email: user.email, role: user.role, username: user.username });

    await logEvent({ level: 'INFO', event: 'LOGIN_SUCCESS', userId: user.id,
      message: `User ${user.username} logged in`, meta: { username: user.username, role: user.role } });

    res.json({ message: 'Login สำเร็จ', token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ valid: false, error: 'No token' });
  try {
    const decoded = verifyToken(token);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// GET /api/auth/health
router.get('/health', (_, res) => res.json({ status: 'ok', service: 'auth-service' }));

module.exports = router;
