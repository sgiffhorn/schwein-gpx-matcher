import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from '../db.js'; // your MySQL helper

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_HASH = process.env.ADMIN_PASS_HASH; // bcrypt hash of your admin password
const ADMIN_USER = process.env.ADMIN_USER;

// Unprotected: login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, ADMIN_HASH);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// Middleware: protect everything below
router.use((req, res, next) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth, JWT_SECRET);
    if (payload.role !== 'admin') throw new Error();
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// GET pending submissions
router.get('/submissions', async (req, res) => {
  const rows = await query(
    `SELECT id, first_name, last_name, date, moving_time_seconds, frikadelle_img IS NOT NULL AS frikadelle, accepted
     FROM submissions
     WHERE accepted = 0`
  );
  res.json(rows);
});

// Approve one
router.post('/submissions/:id/approve', async (req, res) => {
  const { id } = req.params;
  await query(`UPDATE submissions SET accepted=1 WHERE id=?`, [id]);
  res.json({ success: true });
});

export default router;