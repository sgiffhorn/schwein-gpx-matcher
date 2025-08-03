import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from '../db.js'; // your MySQL helper
import multer     from 'multer';
import { parse }  from 'csv-parse/sync';

const upload = multer();

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
  console.log(auth);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth, JWT_SECRET);
    console.log(payload);
    if (payload.role !== 'admin') throw new Error();
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// GET all submissions
router.get('/submissions', async (req, res) => {
  const rows = await query(
    `SELECT *
     FROM submissions`
  );
  res.json(rows);
});

// Approve one
router.post('/submissions/:id/approve', async (req, res) => {
  const { id } = req.params;
  // pull fields from body
  const { frikadelle_eaten, external_comment } = req.body;
  const ate     = frikadelle_eaten ? 1 : 0;
  const comment = external_comment?.trim() || null;

  await query(
    `UPDATE submissions
       SET accepted         = 1,
           frikadelle_eaten  = ?,
           external_comment  = ?
     WHERE id = ?`,
    [ate, comment, id]
  );

  res.json({ success: true });
});

// … after your approve route, before export default:
router.post(
  '/submissions/import',
  upload.single('csv'),
  async (req, res) => {
    try {
      // 1) get text
      let text;
      if (req.file) text = req.file.buffer.toString('utf8');
      else           text = req.body.text;

      // 2) parse CSV; semicolon-delimited, with header
      const records = parse(text, {
        delimiter: ';',
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // 3) map & insert each row
      for (const row of records) {
        const last = row['Name'];
        const first= row['Vorname'];
        const name = `${first} ${last}`.trim();

        // date DD.MM.YYYY → YYYY-MM-DD
        const [dd, MM, yyyy] = row['Datum'].split('.');
        const activity_date = `${yyyy}-${MM.padStart(2,'0')}-${dd.padStart(2,'0')}`;

        // Zeit hh:mm → seconds
        const [h, m] = row['Zeit'].split(':').map(n=>parseInt(n,10));
        const moving_time_seconds = (h||0)*3600 + (m||0)*60;

        // medal HTML → eaten flag
        const medalHtml = row['Medaille']||'';
        let frikadelle_eaten = 0;
        if (/Gouden/.test(medalHtml))       frikadelle_eaten = 1;
        else if (/Zilveren/.test(medalHtml)) {
          // if silver AND time ≥11:30 (41400s)
          if (moving_time_seconds >= 11*3600 + 30*60) frikadelle_eaten = 1;
        }

        const external_comment = row['Anmerkungen'] || null;

        // upsert or insert
        await query(
          `INSERT INTO submissions
             (name, activity_date, moving_time_seconds,
              match_percentage, frikadelle_image, frikadelle_eaten,
              internal_comment, external_comment, accepted)
           VALUES (?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             moving_time_seconds = VALUES(moving_time_seconds),
             frikadelle_eaten    = VALUES(frikadelle_eaten),
             external_comment    = VALUES(external_comment),
             accepted            = 1`,
          [
            name,
            activity_date,
            moving_time_seconds,
            null,       // match_percentage
            null,       // frikadelle_image
            frikadelle_eaten,
            null,       // internal_comment
            external_comment,
            1           // accepted
          ]
        );
      }

      res.json({ success: true, imported: records.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;