import express from 'express';
import multer from 'multer';
import { query } from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

// POST /api/hall-of-fame
router.post('/', upload.single('frikadelleImage'), async (req, res) => {
  const { name, activityDate, movingTimeSeconds, matchPercentage, internalComment } = req.body;
  // require defined, not just truthy
  if (
    !name?.trim() ||
    activityDate == null ||
    movingTimeSeconds == null ||
    matchPercentage == null
  ) { 
    return res.status(400).json({ error: 'missing_fields' });
  }

  // duplicate check
  const [rows] = await query(
    'SELECT id FROM submissions WHERE name=? AND activity_date=?',
    [name, activityDate]
  );
  if (rows && rows.length > 0) {
    return res.status(409).json({ error: 'duplicate_submission' });
  }

  // insert
  const imageBuffer = req.file?.buffer || null;
  const eatenFlag    = false;
  const extComment   = null; // external_comment is set later by admin
  const acceptedFlag = false;
  await query(
    `INSERT INTO submissions
       (name,
        activity_date,
        moving_time_seconds,
        match_percentage,
        frikadelle_image,
        frikadelle_eaten,
        internal_comment,
        external_comment,
        accepted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      activityDate,
      movingTimeSeconds,
      matchPercentage,
      imageBuffer,
      eatenFlag,
      internalComment || null,
      extComment,
      acceptedFlag,
    ]
  );
  res.status(201).json({ success: true });
});

export default router;