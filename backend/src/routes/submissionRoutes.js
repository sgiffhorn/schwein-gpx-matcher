import express from 'express';
import multer from 'multer';
import db from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

// POST /api/hall-of-fame
router.post('/', upload.single('frikadelleImage'), async (req, res) => {
  const { firstName, lastName, activityDate, movingTimeSeconds, matchPercentage } = req.body;
  if (!firstName || !lastName || !activityDate) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  // duplicate check
  const [rows] = await db.query(
    'SELECT id FROM hall_of_fame WHERE first_name=? AND last_name=? AND activity_date=?',
    [firstName, lastName, activityDate]
  );
  if (rows.length) {
    return res.status(409).json({ error: 'duplicate_submission' });
  }

  // insert
  const imageBuffer = req.file?.buffer || null;
  await db.query(
    `INSERT INTO hall_of_fame
      (first_name, last_name, activity_date, moving_time_seconds, match_percentage,
       frikadelle_image, frikadelle_eaten, accepted)
     VALUES (?, ?, ?, ?, ?, ?, false, false)`,
    [firstName, lastName, activityDate, movingTimeSeconds||null, matchPercentage||null, imageBuffer]
  );
  res.status(201).json({ success: true });
});

export default router;