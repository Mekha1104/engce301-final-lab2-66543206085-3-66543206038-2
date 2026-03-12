const express     = require('express');
const { pool }    = require('../db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

async function logEvent({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      `INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1,$2,$3,$4,$5)`,
      [level, event, userId || null, message || null, meta ? JSON.stringify(meta) : null]
    );
  } catch (_) {}
}

// GET /api/users/profile — ดู profile ตัวเอง
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM user_profiles WHERE user_id=$1`, [req.user.sub]
    );
    if (!result.rows[0]) {
      // Auto-create profile ถ้ายังไม่มี
      const created = await pool.query(
        `INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2) RETURNING *`,
        [req.user.sub, req.user.username || '']
      );
      return res.json({ profile: created.rows[0] });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/profile — แก้ไข profile
router.put('/profile', async (req, res) => {
  const { display_name, bio, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO user_profiles (user_id, display_name, bio, avatar_url)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE
       SET display_name=COALESCE($2, user_profiles.display_name),
           bio=COALESCE($3, user_profiles.bio),
           avatar_url=COALESCE($4, user_profiles.avatar_url),
           updated_at=NOW()
       RETURNING *`,
      [req.user.sub, display_name, bio, avatar_url]
    );
    await logEvent({ level: 'INFO', event: 'PROFILE_UPDATED', userId: req.user.sub,
      message: `Profile updated for user ${req.user.sub}` });
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/all — ดูรายชื่อ users ทั้งหมด
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM user_profiles ORDER BY user_id`);
    res.json({ profiles: result.rows, count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — ลบ user profile
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM user_profiles WHERE user_id=$1', [id]);
    await logEvent({ level: 'INFO', event: 'PROFILE_DELETED', userId: req.user.sub,
      message: `Profile deleted for user_id ${id}` });
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
