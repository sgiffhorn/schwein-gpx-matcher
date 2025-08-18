// src/routes/fameRoutes.js
import express from 'express';
import { Submission } from '../models/index.js';

const router = express.Router();

const FAST_TIME_SEC = 11 * 3600 + 30 * 60; // 11:30:00
function medalFrom(r) {
  if (r.medal_override && r.medal_override !== 'none') return r.medal_override;
  const fast = r.moving_time_seconds < FAST_TIME_SEC;
  if (fast && r.frikadelle_eaten) return 'gold';
  if (fast || r.frikadelle_eaten) return 'silver';
  return 'bronze';
}

router.get('/', async (req, res) => {
  const rows = await Submission.findAll({
    where: { accepted: true },
    order: [['activity_date', 'DESC'], ['created_at', 'DESC']]
  });

  const out = rows.map(r => ({
    id: r.id,
    name: r.name,
    activityDate: r.activity_date,                   // 'YYYY-MM-DD' (DATEONLY)
    movingTimeSeconds: r.moving_time_seconds,
    matchPercentage: r.match_percentage,             // number|null thanks to getter
    medal: medalFrom(r),
    externalComment: r.external_comment ?? '',
  }));

  res.json(out);
});

export default router;