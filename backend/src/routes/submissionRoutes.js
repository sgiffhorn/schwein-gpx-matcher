import express from 'express';
import multer from 'multer';
import { query } from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

// POST /api/hall-of-fame
router.post('/', upload.single('frikadelleImage'), async (req, res) => {
  const { name, activityDate, movingTimeSeconds, matchPercentage } = req.body;
  if (!firstName || !lastName || !activityDate) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  // duplicate check
  const [rows] = await query(
    'SELECT id FROM hall_of_fame WHERE name=? AND activity_date=?',
    [name, activityDate]
  );
  if (rows.length) {
    return res.status(409).json({ error: 'duplicate_submission' });
  }

  // insert
  const imageBuffer = req.file?.buffer || null;
  await query(
    `INSERT INTO hall_of_fame
      (name, activity_date, moving_time_seconds, match_percentage,
       frikadelle_image, frikadelle_eaten, accepted)
     VALUES (?, ?, ?, ?, ?, ?, false, false)`,
    [name, activityDate, movingTimeSeconds||null, matchPercentage||null, imageBuffer]
  );
  res.status(201).json({ success: true });
});

export default router;