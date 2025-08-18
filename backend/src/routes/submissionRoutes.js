import express from 'express';
import multer from 'multer';
import { Submission } from '../models/index.js'; // { Submission } if you export multiple
// if your models/index.js exports { sequelize, Submission } do: import { Submission } from '../models/index.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// helper: ensure YYYY-MM-DD (DB DATEONLY)
function toDateOnly(value) {
  // Accept "YYYY-MM-DD", ISO, or "DD.MM.YYYY" from the UI
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;             // already DATEONLY
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  // try DD.MM.YYYY
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

router.post(
  '/',
  upload.fields([
    { name: 'frikadelleImage', maxCount: 1 },
    { name: 'gpx',            maxCount: 1 }, // <-- GPX file from the GPX flow
  ]),
  async (req, res) => {
    try {
      const {
        name,
        activityDate,                 // can be ISO or DD.MM.YYYY from frontend
        movingTimeSeconds,
        matchPercentage,
        internalComment,
        externalComment,
        stravaActivityId,
        medalOverride
      } = req.body;

      // basic validation
      const dateOnly = toDateOnly(activityDate);
      const moving = Number(movingTimeSeconds);
      const match = (matchPercentage === '' || matchPercentage == null) ? null : Number(matchPercentage);

      if (!name || !dateOnly || !Number.isFinite(moving)) {
        return res.status(400).json({ error: 'missing_fields' });
      }

      // files
      const frika = req.files?.frikadelleImage?.[0] || null;
      const gpx   = req.files?.gpx?.[0] || null;

      // store GPX content as text (UTF-8)
      const gpx_xml  = gpx ? gpx.buffer.toString('utf8') : null;

      const payload = {
        name,
        activity_date: dateOnly,
        moving_time_seconds: moving,
        match_percentage: match,
        frikadelle_image: frika ? frika.buffer : null,
        frikadelle_eaten: false, // admin toggles this on approve
        internal_comment: internalComment || null,
        external_comment: externalComment || null,
        accepted: false,
        strava_activity_id: stravaActivityId || null,
        gpx_xml,
        medal_override: medalOverride || null,
      };

      // dedupe by (name, activity_date) and unique strava_activity_id
      const created = await Submission.create(payload);
      res.status(201).json({ success: true, id: created.id });
    } catch (err) {
      // handle duplicates nicely
      if (err?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'duplicate_submission' });
      }
      console.error(err);
      res.status(500).json({ error: 'server_error' });
    }
  }
);

export default router;